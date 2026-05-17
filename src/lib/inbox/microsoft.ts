/**
 * Microsoft Graph inbox client — mirror of `inbox/gmail.ts`.
 *
 * Push subscriptions:
 *   - POST /subscriptions with `notificationUrl`, `resource: 'me/messages'`,
 *     `changeType: 'created'`, `clientState: <our secret>`, expiration TTL
 *     max ~4230 minutes (~3 days). Microsoft sends a one-time validation
 *     request (GET) with `validationToken` query param immediately after
 *     subscription create; the route handler echoes it as plain text.
 *   - We persist subscription state in `oauth_tokens.metadata.outlook_inbox`.
 *
 * Fetching messages:
 *   - GET /me/messages/{id} returns the email; we parse from/to/subject and
 *     either body (HTML preferred) or bodyPreview as fallback.
 *
 * Contact matching reuses `inbox/contact-match.ts` from the Gmail flow.
 */

import crypto from "crypto";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getOAuthConnection, getValidAccessToken } from "@/lib/oauth/tokens";
import { logger } from "@/lib/logger";
import { matchEmailToRecord, parseFromHeader } from "./contact-match";

const MS_GRAPH_BASE = "https://graph.microsoft.com/v1.0";

async function authedFetch(accessToken: string, path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${MS_GRAPH_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
}

// ─── Subscriptions ─────────────────────────────────────────────────────────

export interface OutlookSubscriptionInput {
  notificationUrl: string;
  clientState: string;
  ttlMinutes?: number; // default 4230 (Graph max)
}

export interface OutlookSubscriptionResult {
  id: string;
  expirationDateTime: string;
  resource: string;
}

interface RawSubscription {
  id: string;
  expirationDateTime: string;
  resource: string;
}

export async function createOutlookInboxSubscription(
  accessToken: string,
  input: OutlookSubscriptionInput,
): Promise<OutlookSubscriptionResult> {
  const expiration = new Date(Date.now() + (input.ttlMinutes ?? 4230) * 60 * 1000).toISOString();
  const res = await authedFetch(accessToken, `/subscriptions`, {
    method: "POST",
    body: JSON.stringify({
      changeType: "created",
      notificationUrl: input.notificationUrl,
      resource: "me/messages",
      expirationDateTime: expiration,
      clientState: input.clientState,
      latestSupportedTlsVersion: "v1_2",
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Graph /subscriptions create failed (${res.status}): ${text}`);
  }
  const json = (await res.json()) as RawSubscription;
  return { id: json.id, expirationDateTime: json.expirationDateTime, resource: json.resource };
}

export async function renewOutlookSubscription(
  accessToken: string,
  subscriptionId: string,
  ttlMinutes = 4230,
): Promise<OutlookSubscriptionResult> {
  const expiration = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
  const res = await authedFetch(accessToken, `/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    method: "PATCH",
    body: JSON.stringify({ expirationDateTime: expiration }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Graph /subscriptions renew failed (${res.status}): ${text}`);
  }
  const json = (await res.json()) as RawSubscription;
  return { id: json.id, expirationDateTime: json.expirationDateTime, resource: json.resource };
}

export async function deleteOutlookSubscription(
  accessToken: string,
  subscriptionId: string,
): Promise<void> {
  const res = await authedFetch(accessToken, `/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => "");
    throw new Error(`Graph /subscriptions delete failed (${res.status}): ${text}`);
  }
}

// ─── Message fetch ─────────────────────────────────────────────────────────

export interface OutlookMessage {
  id: string;
  conversationId?: string;
  subject?: string | null;
  from?: { emailAddress?: { address?: string; name?: string } };
  toRecipients?: Array<{ emailAddress?: { address?: string } }>;
  ccRecipients?: Array<{ emailAddress?: { address?: string } }>;
  internetMessageId?: string;
  receivedDateTime?: string;
  bodyPreview?: string;
  body?: { content?: string; contentType?: "html" | "text" };
  isRead?: boolean;
}

export async function getOutlookMessage(
  accessToken: string,
  messageId: string,
): Promise<OutlookMessage> {
  const params = "?$select=id,conversationId,subject,from,toRecipients,ccRecipients,internetMessageId,receivedDateTime,bodyPreview,body,isRead";
  const res = await authedFetch(accessToken, `/me/messages/${encodeURIComponent(messageId)}${params}`);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Graph /me/messages/${messageId} failed (${res.status}): ${text}`);
  }
  return (await res.json()) as OutlookMessage;
}

// ─── Helpers — parse + ingest ──────────────────────────────────────────────

export function parseRecipients(
  recipients: OutlookMessage["toRecipients"],
): string[] {
  if (!recipients) return [];
  return recipients
    .map((r) => r.emailAddress?.address?.trim().toLowerCase() ?? "")
    .filter((a) => a.includes("@"));
}

export function parseFromAddress(msg: OutlookMessage): string {
  const addr = msg.from?.emailAddress?.address?.trim().toLowerCase();
  if (addr && addr.includes("@")) return addr;
  // fall back to legacy parsing if Graph hands us a display-name form
  const name = msg.from?.emailAddress?.name;
  if (name) return parseFromHeader(name).toLowerCase();
  return "";
}

/**
 * INSERT an Outlook message into `email_communications` if it's from a
 * known contact/lead and not already stored.
 */
export async function ingestOutlookMessage(args: {
  teamId: string;
  accountId: string;
  message: OutlookMessage;
}): Promise<{ inserted: boolean; row_id: string | null; reason?: string }> {
  const { teamId, accountId, message } = args;
  const supabase = createSupabaseAdmin();

  const existing = await supabase
    .from("email_communications")
    .select("id")
    .eq("provider", "outlook")
    .eq("provider_message_id", message.id)
    .maybeSingle();
  if (existing.data?.id) {
    return { inserted: false, row_id: existing.data.id, reason: "duplicate" };
  }

  const fromEmail = parseFromAddress(message);
  if (!fromEmail.includes("@")) {
    return { inserted: false, row_id: null, reason: "no_from" };
  }
  const match = await matchEmailToRecord(teamId, fromEmail);
  if (!match) {
    return { inserted: false, row_id: null, reason: "no_contact_match" };
  }

  const html = message.body?.contentType === "html" ? message.body.content ?? null : null;
  const text =
    message.body?.contentType === "text"
      ? message.body.content ?? null
      : html
        ? null
        : message.bodyPreview ?? null;

  const sentAt = message.receivedDateTime ?? new Date().toISOString();
  const row = {
    team_id: teamId,
    account_id: accountId,
    contact_id: match.kind === "contact" ? match.id : null,
    lead_id: match.kind === "lead" ? match.id : null,
    subject: message.subject ?? null,
    body_text: text,
    body_html: html,
    from_email: fromEmail,
    to_emails: parseRecipients(message.toRecipients),
    cc_emails: parseRecipients(message.ccRecipients),
    direction: "inbound" as const,
    status: "delivered" as const,
    message_id: message.internetMessageId ?? null,
    thread_id: message.conversationId ?? message.id,
    metadata: { outlook_is_read: message.isRead ?? null },
    provider: "outlook" as const,
    provider_message_id: message.id,
    sent_at: sentAt,
  };

  const { data, error } = await supabase
    .from("email_communications")
    .insert(row)
    .select("id")
    .single();
  if (error) {
    logger.error("OutlookInbox", "INSERT email_communications failed", error);
    throw new Error(`email_communications insert failed: ${error.message}`);
  }
  return { inserted: true, row_id: data.id };
}

// ─── Per-connection subscription state ────────────────────────────────────

export interface OutlookInboxState {
  subscription_id: string;
  client_state: string;
  expiration: string;
  notification_url: string;
  started_at: string;
}

export async function persistOutlookInboxState(
  connectionId: string,
  state: OutlookInboxState,
): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { data: row } = await supabase
    .from("oauth_tokens")
    .select("metadata")
    .eq("id", connectionId)
    .single();
  const metadata = { ...(row?.metadata ?? {}), outlook_inbox: state };
  await supabase.from("oauth_tokens").update({ metadata }).eq("id", connectionId);
}

export async function ensureOutlookInboxSubscription(args: {
  teamId: string;
}): Promise<OutlookInboxState | null> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    logger.warn("OutlookInbox", "NEXT_PUBLIC_APP_URL not set — skipping subscription");
    return null;
  }
  const connection = await getOAuthConnection(args.teamId, "microsoft");
  if (!connection) return null;
  const accessToken = await getValidAccessToken(connection);

  const notificationUrl = `${appUrl.replace(/\/$/, "")}/api/webhooks/microsoft/inbox`;
  const clientState = crypto.randomBytes(24).toString("base64url");
  const sub = await createOutlookInboxSubscription(accessToken, {
    notificationUrl,
    clientState,
  });
  const state: OutlookInboxState = {
    subscription_id: sub.id,
    client_state: clientState,
    expiration: sub.expirationDateTime,
    notification_url: notificationUrl,
    started_at: new Date().toISOString(),
  };
  await persistOutlookInboxState(connection.id, state);
  return state;
}

/**
 * Extract a message ID out of the resource path Graph sends in push
 * notifications, e.g. `Users/<userId>/Messages/<messageId>` or
 * `me/messages/<messageId>`.
 */
export function extractMessageIdFromResource(resource: string): string | null {
  const m = /Messages\/([^/]+)$/i.exec(resource);
  return m?.[1] ?? null;
}
