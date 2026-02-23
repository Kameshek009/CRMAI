import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { sendWhatsAppMessageSchema } from "@/lib/crm/validation";
import { getWhatsAppConfig } from "@/lib/whatsapp/helpers";
import { WhatsAppClient } from "@/lib/whatsapp/client";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "contacts", "create", context.isDirector);
    if (permError) return permError;

    const body = await request.json();
    const parsed = sendWhatsAppMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }

    // Load WhatsApp config
    const config = await getWhatsAppConfig(context.teamId);
    if (!config) {
      return NextResponse.json({ success: false, error: "WhatsApp not configured" }, { status: 400 });
    }

    const client = new WhatsAppClient(config);
    const supabase = createSupabaseAdmin();

    let waMessageId: string;
    const messageType = parsed.data.message_type || "text";

    try {
      if (messageType === "template" && parsed.data.template_name) {
        waMessageId = await client.sendTemplateMessage(
          parsed.data.to_number,
          parsed.data.template_name,
          "en",
          parsed.data.template_params || []
        );
      } else {
        if (!parsed.data.content) {
          return NextResponse.json({ success: false, error: "Content is required for text messages" }, { status: 400 });
        }
        waMessageId = await client.sendTextMessage(parsed.data.to_number, parsed.data.content);
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : "Failed to send";
      logger.error("WhatsApp", "Send failed", e);

      // Save failed message
      await supabase.from("whatsapp_messages").insert({
        account_id: context.accountId,
        team_id: context.teamId,
        contact_id: parsed.data.contact_id || null,
        lead_id: parsed.data.lead_id || null,
        from_number: config.phoneNumberId,
        to_number: parsed.data.to_number,
        content: parsed.data.content || null,
        message_type: messageType,
        direction: "outbound",
        status: "failed",
        template_name: parsed.data.template_name || null,
        template_params: parsed.data.template_params || [],
        error_message: errMsg,
      });

      return NextResponse.json({ success: false, error: errMsg }, { status: 502 });
    }

    // Save sent message
    const { data, error: dbError } = await supabase
      .from("whatsapp_messages")
      .insert({
        account_id: context.accountId,
        team_id: context.teamId,
        contact_id: parsed.data.contact_id || null,
        lead_id: parsed.data.lead_id || null,
        wa_message_id: waMessageId,
        from_number: config.phoneNumberId,
        to_number: parsed.data.to_number,
        content: parsed.data.content || null,
        message_type: messageType,
        direction: "outbound",
        status: "sent",
        template_name: parsed.data.template_name || null,
        template_params: parsed.data.template_params || [],
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      logger.error("WhatsApp", "Failed to save sent message", dbError);
      return NextResponse.json({ success: false, error: "Message sent but failed to save" }, { status: 500 });
    }

    // Log activity
    try {
      await supabase.from("crm_activities").insert({
        account_id: context.accountId,
        team_id: context.teamId,
        contact_id: parsed.data.contact_id || null,
        type: "whatsapp",
        title: `WhatsApp: ${messageType === "template" ? parsed.data.template_name : (parsed.data.content?.slice(0, 50) || "message")}`,
        description: parsed.data.content?.slice(0, 200) || null,
      });
    } catch (e) { logger.error("WhatsApp", "Failed to log activity", e); }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("WhatsApp", "Send error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
