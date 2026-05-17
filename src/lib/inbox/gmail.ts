/**
 * Gmail API client — thin wrapper around `https://gmail.googleapis.com` that
 * uses the access token from `oauth_tokens` (auto-refreshed in tokens.ts).
 *
 * Covered surface:
 *   - users.watch / users.stop — start and stop Pub/Sub notifications
 *   - users.history.list      — pull added messages since last historyId
 *   - users.messages.get      — fetch a specific message with metadata
 *
 * We never persist raw message bodies in outbox events or logs — they can
 * be megabytes and may contain PII.
 */

import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getOAuthConnection, getValidAccessToken } from "@/lib/oauth/tokens";
import { logger } from "@/lib/logger";
import { matchEmailToRecord, parseFromHeader } from "./contact-match";

const GMAIL_BASE = "https://gmail.googleapis.com/gmail/v1";

export interface GmailWatchResult {
  historyId: string;
  expiration: string; // ms-since-epoch, but returned as string by Gmail
}

interface RawGmailWatch {
  historyId: string;
  expiration: string;
}

async function authedFetch(accessToken: string, path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${GMAIL_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
  return res;
}

/**
 * Register a watch on the connected mailbox. `topicName` is the fully
 * qualified Pub/Sub topic, e.g. `projects/<proj>/topics/gmail-inbox-events`.
 */
export async function startGmailWatch(
  accessToken: string,
  topicName: string,
): Promise<GmailWatchResult> {
  const res = await authedFetch(accessToken, `/users/me/watch`, {
    method: "POST",
    body: JSON.stringify({
      topicName,
      labelIds: ["INBOX"],
      labelFilterBehavior: "INCLUDE",
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`gmail.watch failed (${res.status}): ${text}`);
  }
  const json = (await res.json()) as RawGmailWatch;
  return { historyId: json.historyId, expiration: json.expiration };
}

export async function stopGmailWatch(accessToken: string): Promise<void> {
  const res = await authedFetch(accessToken, `/users/me/stop`, { method: "POST" });
  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => "");
    throw new Error(`gmail.stop failed (${res.status}): ${text}`);
  }
}

export interface GmailHistoryItem {
  id: string;
  messages?: { id: string; threadId: string }[];
  messagesAdded?: { message: { id: string; threadId: string; labelIds?: string[] } }[];
}

export interface GmailHistoryResponse {
  history?: GmailHistoryItem[];
  historyId: string;
  nextPageToken?: string;
}

export async function listGmailHistory(
  accessToken: string,
  startHistoryId: string,
  pageToken?: string,
): Promise<GmailHistoryResponse> {
  const params = new URLSearchParams({
    startHistoryId,
    historyTypes: "messageAdded",
    labelId: "INBOX",
  });
  if (pageToken) params.set("pageToken", pageToken);
  const res = await authedFetch(accessToken, `/users/me/history?${params.toString()}`);
  if (res.status === 404) {
    // historyId too old (Gmail keeps ~7 days). Caller should re-watch.
    throw new Error("gmail.history.expired");
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`gmail.history.list failed (${res.status}): ${text}`);
  }
  return (await res.json()) as GmailHistoryResponse;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: {
    headers?: { name: string; value: string }[];
    mimeType?: string;
    body?: { data?: string; size?: number };
    parts?: GmailMessagePart[];
  };
}

export interface GmailMessagePart {
  mimeType: string;
  body?: { data?: string; size?: number };
  parts?: GmailMessagePart[];
  headers?: { name: string; value: string }[];
}

export async function getGmailMessage(
  accessToken: string,
  messageId: string,
  format: "full" | "metadata" = "full",
): Promise<GmailMessage> {
  const params = new URLSearchParams({ format });
  if (format === "metadata") {
    // Limit metadata headers fetched to those we actually parse.
    for (const h of ["From", "To", "Cc", "Subject", "Date", "Message-Id", "In-Reply-To", "References"]) {
      params.append("metadataHeaders", h);
    }
  }
  const res = await authedFetch(
    accessToken,
    `/users/me/messages/${encodeURIComponent(messageId)}?${params.toString()}`,
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`gmail.messages.get failed (${res.status}): ${text}`);
  }
  return (await res.json()) as GmailMessage;
}

/**
 * Pull a header value (case-insensitive) from a Gmail payload.
 */
export function getHeader(
  payload: GmailMessage["payload"] | GmailMessagePart | undefined,
  name: string,
): string | null {
  if (!payload?.headers) return null;
  const lower = name.toLowerCase();
  for (const h of payload.headers) {
    if (h.name.toLowerCase() === lower) return h.value;
  }
  return null;
}

/**
 * Walk the MIME tree and return the first text/plain (preferred) or text/html
 * body decoded to UTF-8. Returns `{ text, html }` — either may be null.
 */
export function extractBodies(payload: GmailMessage["payload"]): {
  text: string | null;
  html: string | null;
} {
  let text: string | null = null;
  let html: string | null = null;

  function walk(part: GmailMessagePart | NonNullable<GmailMessage["payload"]>): void {
    const mime = part.mimeType ?? "";
    if (mime === "text/plain" && part.body?.data && !text) {
      text = Buffer.from(part.body.data, "base64url").toString("utf8");
    } else if (mime === "text/html" && part.body?.data && !html) {
      html = Buffer.from(part.body.data, "base64url").toString("utf8");
    }
    if (part.parts) {
      for (const p of part.parts) walk(p);
    }
  }

  if (payload) walk(payload);
  return { text, html };
}

/**
 * Parse a list of comma-separated email addresses out of a To: or Cc: header.
 * Strips display names. Returns the array of bare emails (lowercased).
 */
export function parseAddressList(headerValue: string | null): string[] {
  if (!headerValue) return [];
  // Splitting on commas inside <…> is rare but valid. We do a simple split
  // because Gmail itself rarely produces nested commas in headers.
  return headerValue
    .split(",")
    .map((raw) => parseFromHeader(raw).toLowerCase())
    .filter((e) => e.includes("@"));
}

// ─── DB helpers ────────────────────────────────────────────────────────────

export interface InboundEmailRow {
  team_id: string;
  account_id: string;
  contact_id: string | null;
  lead_id: string | null;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  from_email: string;
  to_emails: string[];
  cc_emails: string[];
  direction: "inbound";
  status: "delivered";
  message_id: string | null;
  in_reply_to: string | null;
  thread_id: string;
  metadata: Record<string, unknown>;
  provider: "gmail";
  provider_message_id: string;
  sent_at: string;
}

/**
 * Convert a Gmail message into the `email_communications` row shape, then
 * INSERT — idempotent on (provider, provider_message_id).
 *
 * Returns `null` when the from-address doesn't match any contact/lead in
 * this workspace; we don't store noise.
 */
export async function ingestGmailMessage(args: {
  teamId: string;
  accountId: string;
  message: GmailMessage;
}): Promise<{ inserted: boolean; row_id: string | null; reason?: string }> {
  const { teamId, accountId, message } = args;
  const supabase = createSupabaseAdmin();

  const existing = await supabase
    .from("email_communications")
    .select("id")
    .eq("provider", "gmail")
    .eq("provider_message_id", message.id)
    .maybeSingle();
  if (existing.data?.id) {
    return { inserted: false, row_id: existing.data.id, reason: "duplicate" };
  }

  const fromHeader = getHeader(message.payload, "From");
  const fromEmail = fromHeader ? parseFromHeader(fromHeader).toLowerCase() : "";
  if (!fromEmail.includes("@")) {
    return { inserted: false, row_id: null, reason: "no_from" };
  }

  const match = await matchEmailToRecord(teamId, fromEmail);
  if (!match) {
    return { inserted: false, row_id: null, reason: "no_contact_match" };
  }

  const toHeader = getHeader(message.payload, "To");
  const ccHeader = getHeader(message.payload, "Cc");
  const subject = getHeader(message.payload, "Subject");
  const messageIdHeader = getHeader(message.payload, "Message-Id");
  const inReplyTo = getHeader(message.payload, "In-Reply-To");
  const dateHeader = getHeader(message.payload, "Date");

  const { text, html } = extractBodies(message.payload);
  const internalMs = message.internalDate ? Number(message.internalDate) : Date.now();
  const sentAt = dateHeader ? new Date(dateHeader).toISOString() : new Date(internalMs).toISOString();

  const row: InboundEmailRow = {
    team_id: teamId,
    account_id: accountId,
    contact_id: match.kind === "contact" ? match.id : null,
    lead_id: match.kind === "lead" ? match.id : null,
    subject,
    body_text: text,
    body_html: html,
    from_email: fromEmail,
    to_emails: parseAddressList(toHeader),
    cc_emails: parseAddressList(ccHeader),
    direction: "inbound",
    status: "delivered",
    message_id: messageIdHeader,
    in_reply_to: inReplyTo,
    thread_id: message.threadId,
    metadata: {
      gmail_label_ids: message.labelIds ?? [],
      gmail_snippet: message.snippet ?? null,
    },
    provider: "gmail",
    provider_message_id: message.id,
    sent_at: sentAt,
  };

  const { data, error } = await supabase
    .from("email_communications")
    .insert(row)
    .select("id")
    .single();
  if (error) {
    logger.error("GmailInbox", "INSERT email_communications failed", error);
    throw new Error(`email_communications insert failed: ${error.message}`);
  }
  return { inserted: true, row_id: data.id };
}

// ─── Watch state on oauth_tokens.metadata ────────────────────────────────

interface GmailWatchState {
  topic: string;
  history_id: string;
  expiration: string;
  started_at: string;
}

export async function persistGmailWatchState(
  connectionId: string,
  state: GmailWatchState,
): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { data: row } = await supabase
    .from("oauth_tokens")
    .select("metadata")
    .eq("id", connectionId)
    .single();
  const metadata = { ...(row?.metadata ?? {}), gmail_watch: state };
  await supabase.from("oauth_tokens").update({ metadata }).eq("id", connectionId);
}

/**
 * Start a watch on the connection's mailbox using the configured Pub/Sub
 * topic. Returns null and logs if `GOOGLE_PUBSUB_TOPIC` is unset (Stage 1
 * deployments without inbox push are still valid).
 */
export async function ensureGmailWatchForConnection(args: {
  teamId: string;
}): Promise<GmailWatchState | null> {
  const topic = process.env.GOOGLE_PUBSUB_TOPIC;
  if (!topic) {
    logger.info("GmailInbox", "GOOGLE_PUBSUB_TOPIC not set — skipping watch");
    return null;
  }
  const connection = await getOAuthConnection(args.teamId, "google");
  if (!connection) {
    logger.warn("GmailInbox", "No Google connection for team", { team_id: args.teamId });
    return null;
  }
  const accessToken = await getValidAccessToken(connection);
  const result = await startGmailWatch(accessToken, topic);
  const state: GmailWatchState = {
    topic,
    history_id: result.historyId,
    expiration: new Date(Number(result.expiration)).toISOString(),
    started_at: new Date().toISOString(),
  };
  await persistGmailWatchState(connection.id, state);
  return state;
}
