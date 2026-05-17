import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { verifyPubsubJwt } from "@/lib/inbox/pubsub-verify";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getValidAccessToken } from "@/lib/oauth/tokens";
import type { OAuthConnectionRow } from "@/lib/oauth/tokens";
import {
  ensureGmailWatchForConnection,
  getGmailMessage,
  ingestGmailMessage,
  listGmailHistory,
  persistGmailWatchState,
} from "@/lib/inbox/gmail";
import { enqueueOrLog } from "@/lib/outbox/enqueue";

/**
 * Pub/Sub push handler for Gmail watch notifications.
 *
 * Payload shape (top-level from Pub/Sub):
 *   { message: { data: <base64 JSON>, messageId, publishTime }, subscription }
 *
 * Inner `data` JSON (from Gmail):
 *   { emailAddress: "<user>@gmail.com", historyId: "<num>" }
 *
 * On each ping we delta-fetch history since the last persisted historyId,
 * pull each newly-added message, match the From: against contacts/leads,
 * and INSERT inbound rows into email_communications.
 *
 * Always returns 200 unless auth fails — Pub/Sub will retry on 5xx and we
 * don't want to hammer ourselves on transient downstream errors.
 */

interface PubsubPushBody {
  message?: {
    data?: string;
    messageId?: string;
    publishTime?: string;
  };
  subscription?: string;
}

interface GmailPushPayload {
  emailAddress: string;
  historyId: string;
}

export async function POST(request: NextRequest) {
  // 1. JWT verification — fail closed.
  const audience = process.env.GOOGLE_PUBSUB_AUDIENCE;
  if (!audience) {
    logger.error("GmailWebhook", "GOOGLE_PUBSUB_AUDIENCE is not configured");
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : null;
  if (!bearer) {
    return NextResponse.json({ error: "Missing authorization" }, { status: 401 });
  }
  try {
    await verifyPubsubJwt(bearer, { audience });
  } catch (e) {
    logger.warn("GmailWebhook", "JWT verification failed", e);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // 2. Parse Pub/Sub envelope.
  let body: PubsubPushBody;
  try {
    body = (await request.json()) as PubsubPushBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const dataB64 = body.message?.data;
  if (!dataB64) {
    logger.warn("GmailWebhook", "No message.data in push body — acking");
    return NextResponse.json({ ok: true });
  }
  let payload: GmailPushPayload;
  try {
    payload = JSON.parse(Buffer.from(dataB64, "base64").toString("utf8")) as GmailPushPayload;
  } catch {
    logger.warn("GmailWebhook", "Failed to decode push payload — acking");
    return NextResponse.json({ ok: true });
  }
  if (!payload.emailAddress || !payload.historyId) {
    return NextResponse.json({ ok: true });
  }

  // 3. Find the connection by email (metadata.email = payload.emailAddress).
  const supabase = createSupabaseAdmin();
  const { data: connections } = await supabase
    .from("oauth_tokens")
    .select("*")
    .eq("provider", "google")
    .filter("metadata->>email", "eq", payload.emailAddress);

  if (!connections || connections.length === 0) {
    logger.info("GmailWebhook", "No connection for emailAddress — acking", {
      email: payload.emailAddress,
    });
    return NextResponse.json({ ok: true });
  }

  for (const row of connections as OAuthConnectionRow[]) {
    try {
      await processConnection(row, payload.historyId);
    } catch (e) {
      logger.error("GmailWebhook", "Connection processing failed", {
        team_id: row.team_id,
        error: e,
      });
      // Continue on next connection — don't 5xx so Pub/Sub doesn't replay.
    }
  }

  return NextResponse.json({ ok: true });
}

async function processConnection(
  row: OAuthConnectionRow,
  pushHistoryId: string,
): Promise<void> {
  const metadata = (row.metadata ?? {}) as { gmail_watch?: { history_id?: string } };
  const lastHistoryId = metadata.gmail_watch?.history_id;
  if (!lastHistoryId) {
    // First push since connect or watch state lost — start a fresh watch.
    await ensureGmailWatchForConnection({ teamId: row.team_id });
    return;
  }
  if (BigInt(pushHistoryId) <= BigInt(lastHistoryId)) {
    // Already processed this delta.
    return;
  }

  const accessToken = await getValidAccessToken(row);

  let startId = lastHistoryId;
  let pageToken: string | undefined;
  let latestHistoryId = startId;

  for (let i = 0; i < 10; i++) {
    let resp;
    try {
      resp = await listGmailHistory(accessToken, startId, pageToken);
    } catch (e) {
      if (e instanceof Error && e.message === "gmail.history.expired") {
        // Re-watch resets historyId.
        await ensureGmailWatchForConnection({ teamId: row.team_id });
        return;
      }
      throw e;
    }
    latestHistoryId = resp.historyId;

    const messageIds = new Set<string>();
    for (const h of resp.history ?? []) {
      for (const m of h.messagesAdded ?? []) {
        if (m.message.labelIds?.includes("INBOX")) {
          messageIds.add(m.message.id);
        }
      }
    }

    for (const id of messageIds) {
      try {
        const message = await getGmailMessage(accessToken, id, "full");
        const result = await ingestGmailMessage({
          teamId: row.team_id,
          accountId: row.account_id,
          message,
        });
        if (result.inserted && result.row_id) {
          await enqueueOrLog(createSupabaseAdmin(), {
            teamId: row.team_id,
            eventType: "email.received",
            entityType: "email_communication",
            entityId: result.row_id,
            payload: {
              provider: "gmail",
              provider_message_id: id,
              thread_id: message.threadId,
            },
          });
        }
      } catch (e) {
        logger.warn("GmailWebhook", "ingest single message failed", { message_id: id, error: e });
      }
    }

    if (!resp.nextPageToken) break;
    pageToken = resp.nextPageToken;
  }

  // Persist the new historyId so the next push can delta against it.
  const watchState = metadata.gmail_watch as { topic?: string; expiration?: string; started_at?: string } | undefined;
  await persistGmailWatchState(row.id, {
    topic: watchState?.topic ?? process.env.GOOGLE_PUBSUB_TOPIC ?? "",
    history_id: latestHistoryId,
    expiration: watchState?.expiration ?? "",
    started_at: watchState?.started_at ?? new Date().toISOString(),
  });
}
