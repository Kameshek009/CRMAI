import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/crm/with-api-handler";
import { getWhatsAppConfig } from "@/lib/whatsapp/helpers";
import { WhatsAppClient } from "@/lib/whatsapp/client";

export const POST = withApiHandler(
  { logTag: "WhatsApp" },
  async (_request, ctx) => {
    if (!ctx.isOwner) {
      return NextResponse.json({ success: false, error: "Only admins can test connection" }, { status: 403 });
    }

    const config = await getWhatsAppConfig(ctx.workspaceId);
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
      .eq("id", ctx.workspaceId)
      .single();

    const settings = (team?.settings || {}) as Record<string, unknown>;
    const wa = (settings.whatsapp || {}) as Record<string, unknown>;
    await supabase
      .from("teams")
      .update({
        settings: { ...settings, whatsapp: { ...wa, is_connected: true } },
      })
      .eq("id", ctx.workspaceId);

    return NextResponse.json({ success: true, data: { name: profile.name, about: profile.about } });
  }
);
