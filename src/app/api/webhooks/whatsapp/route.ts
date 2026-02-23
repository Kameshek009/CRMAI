import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { findTeamByPhoneNumberId, findContactByPhone } from "@/lib/whatsapp/helpers";
import { logger } from "@/lib/logger";

/**
 * GET /api/webhooks/whatsapp
 * WhatsApp webhook verification (challenge-response)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode !== "subscribe" || !token || !challenge) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Find team with matching verify token
  const supabase = createSupabaseAdmin();
  const { data: teams } = await supabase
    .from("teams")
    .select("id, settings")
    .is("deleted_at", null);

  const matched = teams?.find((t) => {
    const settings = t.settings as Record<string, unknown> | null;
    const wa = settings?.whatsapp as Record<string, string> | undefined;
    return wa?.webhook_verify_token === token;
  });

  if (!matched) {
    logger.warn("WhatsApp Webhook", "Verify token not found");
    return NextResponse.json({ error: "Invalid verify token" }, { status: 403 });
  }

  logger.info("WhatsApp Webhook", `Verified for team ${matched.id}`);
  return new NextResponse(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
}

/**
 * POST /api/webhooks/whatsapp
 * Process incoming messages and status updates
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.object !== "whatsapp_business_account") {
      return NextResponse.json({ received: true });
    }

    const supabase = createSupabaseAdmin();

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== "messages") continue;

        const value = change.value;
        const phoneNumberId = value?.metadata?.phone_number_id;
        if (!phoneNumberId) continue;

        // Find team
        const teamInfo = await findTeamByPhoneNumberId(phoneNumberId);
        if (!teamInfo) {
          logger.warn("WhatsApp Webhook", `No team for phone_number_id: ${phoneNumberId}`);
          continue;
        }

        // Process incoming messages
        for (const msg of value.messages || []) {
          // Idempotency check
          const { error: dupError } = await supabase
            .from("whatsapp_webhook_events")
            .insert({ event_id: msg.id, event_type: "message" });

          if (dupError?.code === "23505") continue; // Duplicate

          const fromNumber = msg.from;
          const content = msg.text?.body || msg.caption || `[${msg.type}]`;

          // Try to match contact
          const contactId = await findContactByPhone(teamInfo.teamId, fromNumber);

          await supabase.from("whatsapp_messages").insert({
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
            created_at: new Date(parseInt(msg.timestamp) * 1000).toISOString(),
          });

          // Mark as read
          // (We don't await this to not delay the webhook response)
          fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${(await getAccessToken(teamInfo.teamId))}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              status: "read",
              message_id: msg.id,
            }),
          }).catch(() => {});

          // Log activity
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
        }

        // Process status updates
        for (const status of value.statuses || []) {
          const waMessageId = status.id;
          const newStatus = status.status; // sent, delivered, read, failed

          if (["sent", "delivered", "read", "failed"].includes(newStatus)) {
            await supabase
              .from("whatsapp_messages")
              .update({ status: newStatus })
              .eq("wa_message_id", waMessageId)
              .eq("team_id", teamInfo.teamId);
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error("WhatsApp Webhook", "Processing error", error);
    return NextResponse.json({ received: true }); // Always 200 to prevent retries
  }
}

async function getAccessToken(teamId: string): Promise<string> {
  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from("teams")
    .select("settings")
    .eq("id", teamId)
    .single();

  const settings = data?.settings as Record<string, unknown> | null;
  const wa = settings?.whatsapp as Record<string, string> | undefined;
  return wa?.access_token || "";
}
