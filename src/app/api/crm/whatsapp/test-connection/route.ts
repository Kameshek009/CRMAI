import { NextResponse } from "next/server";
import { getTeamContext } from "@/lib/crm/team-helpers";
import { getWhatsAppConfig } from "@/lib/whatsapp/helpers";
import { WhatsAppClient } from "@/lib/whatsapp/client";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export async function POST() {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    if (!context.isDirector) {
      return NextResponse.json({ success: false, error: "Only admins can test connection" }, { status: 403 });
    }

    const config = await getWhatsAppConfig(context.teamId);
    if (!config) {
      return NextResponse.json({ success: false, error: "WhatsApp not configured" }, { status: 400 });
    }

    const client = new WhatsAppClient(config);
    const profile = await client.getBusinessProfile();

    // Mark as connected
    const supabase = createSupabaseAdmin();
    const { data: team } = await supabase
      .from("teams")
      .select("settings")
      .eq("id", context.teamId)
      .single();

    const settings = (team?.settings || {}) as Record<string, unknown>;
    const wa = (settings.whatsapp || {}) as Record<string, unknown>;
    await supabase
      .from("teams")
      .update({
        settings: { ...settings, whatsapp: { ...wa, is_connected: true } },
      })
      .eq("id", context.teamId);

    return NextResponse.json({ success: true, data: { name: profile.name, about: profile.about } });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Connection failed";
    logger.error("WhatsApp", "Test connection failed", error);
    return NextResponse.json({ success: false, error: msg }, { status: 502 });
  }
}
