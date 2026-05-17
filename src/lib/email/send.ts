import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import { enqueueOrLog } from "@/lib/outbox/enqueue";
import { sendViaResend } from "./resend-client";

export interface SendEmailInput {
  teamId: string;
  accountId: string;
  /** Optional CRM linkage — at least one is recommended for the timeline view. */
  contactId?: string | null;
  leadId?: string | null;
  dealId?: string | null;
  /** Defaults to EMAIL_FROM_DOMAIN-derived address when not given. */
  from?: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  headers?: Record<string, string>;
  /** Forwarded to Resend as message tags for filtering in their dashboard. */
  tags?: Array<{ name: string; value: string }>;
}

export type SendEmailResult =
  | { ok: true; id: string; providerMessageId: string }
  | { ok: false; id?: string; error: string };

/**
 * Persist + deliver an outbound email.
 *
 * Lifecycle of the row in email_communications:
 *   queued  → INSERT before calling Resend (guarantees we have a record even
 *             if the process dies mid-send)
 *   sent    → UPDATE on Resend acceptance, with provider_message_id
 *   failed  → UPDATE on Resend error, with failure_reason
 *
 * The downstream Resend webhook will later flip 'sent' → 'delivered' / 'bounced'
 * / 'complained' and set delivered_at / bounced_at / opened_at / clicked_at.
 *
 * Best-effort enqueue of an `email.sent` outbox event happens after a
 * successful send so external integrations can react in real time.
 */
export async function sendEmail(
  supabase: SupabaseClient,
  input: SendEmailInput,
): Promise<SendEmailResult> {
  const fromAddress = input.from ?? defaultFromAddress();
  if (!fromAddress) {
    return { ok: false, error: "no_from_address_configured" };
  }
  if (input.to.length === 0) return { ok: false, error: "no_recipient" };
  if (!input.html && !input.text) return { ok: false, error: "empty_body" };

  // 1. Persist the queued row first so we never silently lose an attempt.
  const { data: row, error: insertError } = await supabase
    .from("email_communications")
    .insert({
      team_id: input.teamId,
      account_id: input.accountId,
      contact_id: input.contactId ?? null,
      lead_id: input.leadId ?? null,
      deal_id: input.dealId ?? null,
      from_email: fromAddress,
      to_emails: input.to,
      cc_emails: input.cc ?? null,
      bcc_emails: input.bcc ?? null,
      subject: input.subject,
      body_text: input.text ?? null,
      body_html: input.html ?? null,
      direction: "outbound",
      status: "queued",
      provider: "resend",
    })
    .select("id")
    .single();

  if (insertError || !row) {
    logger.error("Email", "Failed to insert email_communications", insertError);
    return { ok: false, error: insertError?.message ?? "insert_failed" };
  }

  const id: string = row.id;

  // 2. Call Resend.
  const res = await sendViaResend({
    from: fromAddress,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    replyTo: input.replyTo,
    headers: input.headers,
    tags: input.tags,
  });

  // 3. Reconcile DB state.
  if (!res.ok) {
    await supabase
      .from("email_communications")
      .update({
        status: "failed",
        failure_reason: res.error.slice(0, 500),
      })
      .eq("id", id);
    return { ok: false, id, error: res.error };
  }

  await supabase
    .from("email_communications")
    .update({
      status: "sent",
      provider_message_id: res.providerMessageId,
      sent_at: new Date().toISOString(),
    })
    .eq("id", id);

  // 4. Notify subscribers (best-effort).
  await enqueueOrLog(supabase, {
    teamId: input.teamId,
    eventType: "email.sent",
    entityType: "email",
    entityId: id,
    payload: {
      email_id: id,
      contact_id: input.contactId ?? null,
      lead_id: input.leadId ?? null,
      deal_id: input.dealId ?? null,
      subject: input.subject,
      to: input.to,
      provider_message_id: res.providerMessageId,
      actor_account_id: input.accountId,
    },
  });

  return { ok: true, id, providerMessageId: res.providerMessageId };
}

export function defaultFromAddress(): string | null {
  const explicit = process.env.EMAIL_FROM_ADDRESS;
  if (explicit) return explicit;
  const domain = process.env.EMAIL_FROM_DOMAIN;
  if (!domain) return null;
  return `Nexxus <no-reply@${domain}>`;
}
