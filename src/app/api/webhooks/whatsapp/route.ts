import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { findTeamByPhoneNumberId, findContactByPhone } from "@/lib/whatsapp/helpers";
import { getWhatsAppSettingsByPhoneNumberId, rowToRuntimeConfig, WhatsAppMigrationPlaintextError } from "@/lib/whatsapp/store";
import { verifyHubSignature } from "@/lib/whatsapp/signature";
import { logger } from "@/lib/logger";
import { createTeamNotification } from "@/lib/crm/notifications";
import { enqueueOrLog } from "@/lib/outbox/enqueue";

/**
 * GET /api/webhooks/whatsapp
 * WhatsApp webhook verification (challenge-response). Meta sends:
 *   ?hub.mode=subscribe&hub.verify_token=<TOKEN>&hub.challenge=<NUM>
 * We match the verify_token against whatsapp_settings rows and echo the
 * challenge. Lookup is via UNIQUE index after migration 059.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode !== "subscribe" || !token || !challenge) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  const { data: row } = await supabase
    .from("whatsapp_settings")
    .select("team_id")
    .eq("webhook_verify_token", token)
    .maybeSingle();

  if (!row) {
    logger.warn("WhatsApp Webhook", "Verify token not found");
    return NextResponse.json({ error: "Invalid verify token" }, { status: 403 });
  }

  logger.info("WhatsApp Webhook", `Verified for team ${row.team_id}`);
  return new NextResponse(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
}

/**
 * POST /api/webhooks/whatsapp
 *
 * Process incoming messages and status updates.
 *
 * Signature verification: Meta signs the body with the App Secret using
 * SHA-256 HMAC and puts `sha256=<hex>` in `X-Hub-Signature-256`. We resolve
 * the per-team app_secret from `whatsapp_settings` using the phone_number_id
 * embedded in the payload, then verify against the raw body. If app_secret
 * is not configured on the team, we fall back to env-level
 * `WHATSAPP_APP_SECRET` (for Embedded Signup mode where the app is ours).
 *
 * Always responds 200 unless verification fails — Meta retries aggressively
 * on 5xx and we don't want loops on transient downstream errors.
 */
export async function POST(request: NextRequest) {
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const envelope = body as {
    object?: string;
    entry?: Array<{ changes?: Array<{ field?: string; value?: WhatsAppWebhookValue }> }>;
  };

  if (envelope.object !== "whatsapp_business_account") {
    return NextResponse.json({ received: true });
  }

  // Resolve any phone_number_id from the first message change so we can pick
  // the app_secret. Meta puts the same phone_number_id on every change in a
  // single payload (one push per WABA).
  const firstPhoneNumberId = findFirstPhoneNumberId(envelope);
  if (!firstPhoneNumberId) {
    return NextResponse.json({ received: true });
  }
  const settings = await getWhatsAppSettingsByPhoneNumberId(firstPhoneNumberId);
  if (!settings) {
    logger.info("WhatsApp Webhook", `Unknown phone_number_id: ${firstPhoneNumberId}`);
    return NextResponse.json({ received: true });
  }

  const signatureHeader = request.headers.get("x-hub-signature-256");
  const appSecret = await resolveAppSecret(settings);
  if (!appSecret) {
    logger.error("WhatsApp Webhook", "No app_secret available — refusing payload", {
      phone_number_id: firstPhoneNumberId,
    });
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }
  if (!verifyHubSignature({ rawBody, signatureHeader, appSecret })) {
    logger.warn("WhatsApp Webhook", "Invalid signature", { phone_number_id: firstPhoneNumberId });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();
  try {
    for (const entry of envelope.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== "messages") continue;
        await processMessageChange(supabase, change.value);
      }
    }
  } catch (error) {
    logger.error("WhatsApp Webhook", "Processing error", error);
  }

  return NextResponse.json({ received: true });
}

// ─── Resolve app_secret per-team or env ────────────────────────────────────

async function resolveAppSecret(
  row: Awaited<ReturnType<typeof getWhatsAppSettingsByPhoneNumberId>>,
): Promise<string | null> {
  if (!row) return null;
  if (row.app_secret_encrypted) {
    try {
      const cfg = rowToRuntimeConfig(row);
      if (cfg.appSecret) return cfg.appSecret;
    } catch (e) {
      if (!(e instanceof WhatsAppMigrationPlaintextError)) throw e;
    }
  }
  // Fall back to env for Embedded Signup deployments where the app is
  // shared and we own the secret.
  return process.env.WHATSAPP_APP_SECRET || null;
}

// ─── Body traversal helpers ────────────────────────────────────────────────

interface WhatsAppWebhookValue {
  metadata?: { phone_number_id?: string };
  contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
  messages?: Array<{
    id: string;
    from: string;
    timestamp?: string;
    type?: string;
    text?: { body?: string };
    caption?: string;
  }>;
  statuses?: Array<{ id: string; status: string; timestamp?: string }>;
}

function findFirstPhoneNumberId(envelope: {
  entry?: Array<{ changes?: Array<{ field?: string; value?: WhatsAppWebhookValue }> }>;
}): string | null {
  for (const entry of envelope.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") continue;
      const id = change.value?.metadata?.phone_number_id;
      if (id) return id;
    }
  }
  return null;
}

// ─── Core change processor ─────────────────────────────────────────────────

async function processMessageChange(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  value: WhatsAppWebhookValue | undefined,
): Promise<void> {
  if (!value) return;
  const phoneNumberId = value.metadata?.phone_number_id;
  if (!phoneNumberId) return;

  const teamInfo = await findTeamByPhoneNumberId(phoneNumberId);
  if (!teamInfo) {
    logger.warn("WhatsApp Webhook", `No team for phone_number_id: ${phoneNumberId}`);
    return;
  }

  for (const msg of value.messages ?? []) {
    // Idempotency: unique constraint on event_id blocks duplicates.
    const { error: dupError } = await supabase
      .from("whatsapp_webhook_events")
      .insert({ event_id: msg.id, event_type: "message" });
    if (dupError?.code === "23505") continue;

    const fromNumber = msg.from;
    const content = msg.text?.body || msg.caption || `[${msg.type ?? "unknown"}]`;

    let contactId = await findContactByPhone(teamInfo.teamId, fromNumber);
    let newlyCreatedContact = false;

    if (!contactId) {
      const waContact = (value.contacts ?? []).find((c) => c.wa_id === fromNumber);
      const profileName = waContact?.profile?.name || fromNumber;

      const { data: newContact } = await supabase
        .from("contacts")
        .insert({
          team_id: teamInfo.teamId,
          account_id: teamInfo.accountId,
          first_name: profileName,
          phone: `+${fromNumber}`,
          source: "whatsapp",
        })
        .select("id")
        .single();

      if (newContact) {
        contactId = newContact.id;
        newlyCreatedContact = true;
        logger.info("WhatsApp Webhook", `Auto-created contact ${contactId} for ${fromNumber}`);

        createTeamNotification({
          teamId: teamInfo.teamId,
          type: "new_contact_whatsapp",
          title: `New contact from WhatsApp: ${profileName}`,
          message: `+${fromNumber}`,
          entityType: "contact",
          entityId: newContact.id,
        });
      }
    }

    const { data: insertedMessage } = await supabase
      .from("whatsapp_messages")
      .insert({
        team_id: teamInfo.teamId,
        account_id: teamInfo.accountId,
        contact_id: contactId,
        wa_message_id: msg.id,
        from_number: fromNumber,
        to_number: phoneNumberId,
        content,
        message_type: msg.type || "text",
        direction: "inbound",
        status: "delivered",
        metadata: { raw_type: msg.type, timestamp: msg.timestamp },
        created_at: msg.timestamp
          ? new Date(parseInt(msg.timestamp) * 1000).toISOString()
          : new Date().toISOString(),
      })
      .select("id")
      .single();

    // Mark-as-read is fire-and-forget — failure shouldn't block the user.
    fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${teamInfo.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: msg.id,
      }),
    }).catch(() => {});

    if (contactId) {
      try {
        await supabase.from("crm_activities").insert({
          account_id: teamInfo.accountId,
          team_id: teamInfo.teamId,
          contact_id: contactId,
          type: "whatsapp",
          title: `WhatsApp from ${fromNumber}`,
          description: content.slice(0, 200),
        });
      } catch { /* ignore */ }
    }

    if (insertedMessage?.id) {
      await enqueueOrLog(supabase, {
        teamId: teamInfo.teamId,
        eventType: "whatsapp.message_received",
        entityType: "whatsapp_message",
        entityId: insertedMessage.id,
        payload: {
          contact_id: contactId,
          newly_created_contact: newlyCreatedContact,
          from_number: fromNumber,
          message_type: msg.type ?? "text",
        },
      });
    }
  }

  // Process status updates from outbound messages.
  for (const status of value.statuses ?? []) {
    const waMessageId = status.id;
    const newStatus = status.status;
    if (!["sent", "delivered", "read", "failed"].includes(newStatus)) continue;

    const { data: updated } = await supabase
      .from("whatsapp_messages")
      .update({ status: newStatus })
      .eq("wa_message_id", waMessageId)
      .eq("team_id", teamInfo.teamId)
      .select("id")
      .maybeSingle();

    if (updated?.id) {
      await enqueueOrLog(supabase, {
        teamId: teamInfo.teamId,
        eventType: `whatsapp.message_${newStatus}`,
        entityType: "whatsapp_message",
        entityId: updated.id,
        payload: { wa_message_id: waMessageId },
      });
    }
  }
}
