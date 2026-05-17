import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { sendWhatsAppMessageSchema } from "@/lib/crm/validation";
import { getWhatsAppConfig } from "@/lib/whatsapp/helpers";
import { WhatsAppMigrationPlaintextError } from "@/lib/whatsapp/store";
import { WhatsAppClient } from "@/lib/whatsapp/client";
import { logger } from "@/lib/logger";

export const POST = withApiHandler(
  {
    permission: { resource: "contacts", action: "create" },
    bodySchema: sendWhatsAppMessageSchema,
    logTag: "WhatsApp",
  },
  async (_request, ctx, { body }) => {
    // Load WhatsApp config
    let config;
    try {
      config = await getWhatsAppConfig(ctx.workspaceId);
    } catch (e) {
      if (e instanceof WhatsAppMigrationPlaintextError) {
        return NextResponse.json(
          { success: false, error: "Re-save WhatsApp settings to encrypt the token before sending." },
          { status: 400 },
        );
      }
      throw e;
    }
    if (!config) {
      return NextResponse.json({ success: false, error: "WhatsApp not configured" }, { status: 400 });
    }

    const client = new WhatsAppClient(config);
    const supabase = createSupabaseAdmin();

    let waMessageId: string;
    const messageType = body.message_type || "text";

    try {
      if (messageType === "template" && body.template_name) {
        waMessageId = await client.sendTemplateMessage(
          body.to_number,
          body.template_name,
          "en",
          body.template_params || []
        );
      } else {
        if (!body.content) {
          return NextResponse.json({ success: false, error: "Content is required for text messages" }, { status: 400 });
        }
        waMessageId = await client.sendTextMessage(body.to_number, body.content);
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : "Failed to send";
      logger.error("WhatsApp", "Send failed", e);

      // Save failed message
      await supabase.from("whatsapp_messages").insert({
        account_id: ctx.accountId,
        team_id: ctx.workspaceId,
        contact_id: body.contact_id || null,
        lead_id: body.lead_id || null,
        from_number: config.phoneNumberId,
        to_number: body.to_number,
        content: body.content || null,
        message_type: messageType,
        direction: "outbound",
        status: "failed",
        template_name: body.template_name || null,
        template_params: body.template_params || [],
        error_message: errMsg,
      });

      return NextResponse.json({ success: false, error: errMsg }, { status: 502 });
    }

    // Save sent message
    const { data, error: dbError } = await supabase
      .from("whatsapp_messages")
      .insert({
        account_id: ctx.accountId,
        team_id: ctx.workspaceId,
        contact_id: body.contact_id || null,
        lead_id: body.lead_id || null,
        wa_message_id: waMessageId,
        from_number: config.phoneNumberId,
        to_number: body.to_number,
        content: body.content || null,
        message_type: messageType,
        direction: "outbound",
        status: "sent",
        template_name: body.template_name || null,
        template_params: body.template_params || [],
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) throw new ApiError("Message sent but failed to save", 500);

    // Log activity
    try {
      await supabase.from("crm_activities").insert({
        account_id: ctx.accountId,
        team_id: ctx.workspaceId,
        contact_id: body.contact_id || null,
        type: "whatsapp",
        title: `WhatsApp: ${messageType === "template" ? body.template_name : (body.content?.slice(0, 50) || "message")}`,
        description: body.content?.slice(0, 200) || null,
      });
    } catch (e) { logger.error("WhatsApp", "Failed to log activity", e); }

    return NextResponse.json({ success: true, data });
  }
);
