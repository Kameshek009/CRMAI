import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext } from "@/lib/crm/team-helpers";
import { whatsappSettingsSchema } from "@/lib/crm/validation";
import { logger } from "@/lib/logger";
import { randomBytes } from "crypto";

export async function GET() {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const supabase = createSupabaseAdmin();
    const { data: team } = await supabase
      .from("teams")
      .select("settings")
      .eq("id", context.teamId)
      .single();

    const settings = team?.settings as Record<string, unknown> | null;
    const wa = settings?.whatsapp as Record<string, unknown> | undefined;

    if (!wa) {
      return NextResponse.json({ success: true, data: null });
    }

    // Mask the access token
    const token = wa.access_token as string | undefined;
    return NextResponse.json({
      success: true,
      data: {
        phone_number_id: wa.phone_number_id || "",
        waba_id: wa.waba_id || "",
        access_token_masked: token ? `${token.slice(0, 8)}...${token.slice(-4)}` : "",
        webhook_verify_token: wa.webhook_verify_token || "",
        is_connected: wa.is_connected || false,
      },
    });
  } catch (error) {
    logger.error("WhatsApp", "GET settings error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    // Only owner / admin should save settings
    if (!context.isDirector) {
      return NextResponse.json({ success: false, error: "Only admins can update integrations" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = whatsappSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    // Get existing settings
    const { data: team } = await supabase
      .from("teams")
      .select("settings")
      .eq("id", context.teamId)
      .single();

    const existingSettings = (team?.settings || {}) as Record<string, unknown>;

    // Auto-generate verify token if not provided
    const webhookVerifyToken = parsed.data.webhook_verify_token || randomBytes(16).toString("hex");

    const newSettings = {
      ...existingSettings,
      whatsapp: {
        phone_number_id: parsed.data.phone_number_id,
        waba_id: parsed.data.waba_id,
        access_token: parsed.data.access_token,
        webhook_verify_token: webhookVerifyToken,
        is_connected: false,
      },
    };

    const { error: updateError } = await supabase
      .from("teams")
      .update({ settings: newSettings })
      .eq("id", context.teamId);

    if (updateError) {
      logger.error("WhatsApp", "Failed to save settings", updateError);
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        phone_number_id: parsed.data.phone_number_id,
        waba_id: parsed.data.waba_id,
        webhook_verify_token: webhookVerifyToken,
      },
    });
  } catch (error) {
    logger.error("WhatsApp", "POST settings error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
