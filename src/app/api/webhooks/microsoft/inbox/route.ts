import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getValidAccessToken } from "@/lib/oauth/tokens";
import type { OAuthConnectionRow } from "@/lib/oauth/tokens";
import {
  extractMessageIdFromResource,
  getOutlookMessage,
  ingestOutlookMessage,
} from "@/lib/inbox/microsoft";
import { enqueueOrLog } from "@/lib/outbox/enqueue";
import { logger } from "@/lib/logger";

/**
 * GET /api/webhooks/microsoft/inbox?validationToken=...
 *
 * Microsoft Graph validates a new subscription by issuing a GET to the
 * notificationUrl with `validationToken` in the query. We must respond
 * with that token as plain text within 10 seconds.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const validationToken = searchParams.get("validationToken");
  if (!validationToken) {
    return NextResponse.json({ error: "Missing validationToken" }, { status: 400 });
  }
  return new NextResponse(validationToken, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

/**
 * POST /api/webhooks/microsoft/inbox
 *
 * Graph sends:
 *   { value: [ { subscriptionId, clientState, resource, changeType: 'created', ... }, ... ] }
 *
 * We look up the per-connection `clientState` from oauth_tokens.metadata and
 * reject when it doesn't match. On match we fetch the full message, run it
 * through the same contact-match + ingest pipeline as Gmail, and emit
 * `email.received` outbox events.
 */
interface NotificationBody {
  value?: Array<{
    subscriptionId?: string;
    clientState?: string;
    resource?: string;
    changeType?: string;
  }>;
}

export async function POST(request: NextRequest) {
  let body: NotificationBody;
  try {
    body = (await request.json()) as NotificationBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const notifications = body.value ?? [];
  if (notifications.length === 0) return NextResponse.json({ ok: true });

  const supabase = createSupabaseAdmin();

  for (const note of notifications) {
    if (!note.subscriptionId || !note.resource || !note.clientState) continue;
    if (note.changeType !== "created") continue;

    const { data: rows } = await supabase
      .from("oauth_tokens")
      .select("*")
      .eq("provider", "microsoft")
      .filter("metadata->outlook_inbox->>subscription_id", "eq", note.subscriptionId);
    if (!rows || rows.length === 0) {
      logger.info("OutlookWebhook", "No connection for subscription — acking", {
        subscription_id: note.subscriptionId,
      });
      continue;
    }
    const row = rows[0] as OAuthConnectionRow;
    const meta = (row.metadata ?? {}) as { outlook_inbox?: { client_state?: string } };
    if (meta.outlook_inbox?.client_state !== note.clientState) {
      logger.warn("OutlookWebhook", "clientState mismatch — ignoring", {
        subscription_id: note.subscriptionId,
      });
      continue;
    }

    const messageId = extractMessageIdFromResource(note.resource);
    if (!messageId) continue;

    try {
      const accessToken = await getValidAccessToken(row);
      const message = await getOutlookMessage(accessToken, messageId);
      const result = await ingestOutlookMessage({
        teamId: row.team_id,
        accountId: row.account_id,
        message,
      });
      if (result.inserted && result.row_id) {
        await enqueueOrLog(supabase, {
          teamId: row.team_id,
          eventType: "email.received",
          entityType: "email_communication",
          entityId: result.row_id,
          payload: {
            provider: "outlook",
            provider_message_id: messageId,
            thread_id: message.conversationId ?? messageId,
          },
        });
      }
    } catch (e) {
      logger.warn("OutlookWebhook", "ingest failed", { message_id: messageId, error: e });
    }
  }

  return NextResponse.json({ ok: true });
}
