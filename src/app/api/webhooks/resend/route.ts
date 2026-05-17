import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { enqueueOrLog } from "@/lib/outbox/enqueue";

/**
 * Inbound webhook from Resend. Resend signs every payload with Svix-style
 * headers (`svix-id`, `svix-timestamp`, `svix-signature`); we verify them
 * with the signing secret configured in the Resend dashboard
 * (`RESEND_WEBHOOK_SECRET`).
 *
 * Each event updates the corresponding row in email_communications keyed by
 * provider_message_id, and emits a domain outbox event (`email.delivered`,
 * `email.bounced`, ...) so external integrations subscribed via
 * webhook_endpoints can react.
 *
 * Event types we care about (see https://resend.com/docs/dashboard/webhooks/event-types):
 *   email.sent              first acceptance — already set by sendEmail, treated as no-op
 *   email.delivered         remote MX accepted the message
 *   email.bounced           hard or soft bounce
 *   email.complained        recipient marked as spam
 *   email.opened            tracking pixel hit
 *   email.clicked           tracked link click
 *   email.delivery_delayed  transient failure, will retry — informational
 */

interface ResendEvent {
  type: string;
  created_at?: string;
  data?: {
    email_id?: string;
    to?: string[];
    subject?: string;
    [k: string]: unknown;
  };
}

const SVIX_HEADERS = ["svix-id", "svix-timestamp", "svix-signature"] as const;

export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    logger.error("ResendWebhook", "RESEND_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const raw = await request.text();
  const headers: Record<string, string> = {};
  for (const name of SVIX_HEADERS) {
    const value = request.headers.get(name);
    if (!value) return NextResponse.json({ error: "Missing signature headers" }, { status: 400 });
    headers[name] = value;
  }

  let event: ResendEvent;
  try {
    const wh = new Webhook(secret);
    event = wh.verify(raw, headers) as ResendEvent;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const providerMessageId = event.data?.email_id;
  if (!providerMessageId) {
    // No id means we can't reconcile — ack so Resend doesn't retry.
    return NextResponse.json({ success: true, ignored: "no_email_id" });
  }

  const supabase = createSupabaseAdmin();
  const { data: row } = await supabase
    .from("email_communications")
    .select("id, team_id, contact_id, lead_id, deal_id, status")
    .eq("provider_message_id", providerMessageId)
    .maybeSingle();

  if (!row) {
    // Resend sometimes fires opens/clicks for very recent sends before we've
    // committed the row. Ack and rely on retry by Resend.
    return NextResponse.json({ success: true, ignored: "no_matching_row" });
  }

  const update = mapEventToUpdate(event.type, event.created_at);
  if (update) {
    await supabase.from("email_communications").update(update).eq("id", row.id);
  }

  // Best-effort outbox emission for subscribers. We use the Resend event type
  // as-is (`email.delivered`, `email.bounced`, ...).
  if (RELAYED_EVENT_TYPES.has(event.type)) {
    await enqueueOrLog(supabase, {
      teamId: row.team_id,
      eventType: event.type,
      entityType: "email",
      entityId: row.id,
      payload: {
        email_id: row.id,
        contact_id: row.contact_id ?? null,
        lead_id: row.lead_id ?? null,
        deal_id: row.deal_id ?? null,
        provider_message_id: providerMessageId,
        provider_event: event.data ?? null,
      },
    });
  }

  return NextResponse.json({ success: true });
}

const RELAYED_EVENT_TYPES = new Set([
  "email.delivered",
  "email.bounced",
  "email.complained",
  "email.opened",
  "email.clicked",
  "email.delivery_delayed",
]);

interface RowUpdate {
  status?: string;
  delivered_at?: string;
  bounced_at?: string;
  opened_at?: string;
  clicked_at?: string;
  failure_reason?: string;
}

function mapEventToUpdate(type: string, createdAt?: string): RowUpdate | null {
  const now = createdAt ?? new Date().toISOString();
  switch (type) {
    case "email.delivered":
      return { status: "delivered", delivered_at: now };
    case "email.bounced":
      return { status: "bounced", bounced_at: now, failure_reason: "bounced" };
    case "email.complained":
      return { status: "complained", failure_reason: "spam_complaint" };
    case "email.opened":
      // Don't overwrite a terminal status; just stamp the open time.
      return { opened_at: now };
    case "email.clicked":
      return { clicked_at: now };
    case "email.delivery_delayed":
    case "email.sent":
      return null;
    default:
      return null;
  }
}
