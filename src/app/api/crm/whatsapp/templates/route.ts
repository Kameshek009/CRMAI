import { NextResponse } from "next/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { getWhatsAppConfig } from "@/lib/whatsapp/helpers";
import { WhatsAppClient } from "@/lib/whatsapp/client";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "contacts", "read", context.isDirector);
    if (permError) return permError;

    const config = await getWhatsAppConfig(context.teamId);
    if (!config) {
      return NextResponse.json({ success: true, data: [] });
    }

    const client = new WhatsAppClient(config);
    const templates = await client.getTemplates();

    return NextResponse.json({ success: true, data: templates });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to fetch templates";
    logger.error("WhatsApp", "GET templates error", error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
