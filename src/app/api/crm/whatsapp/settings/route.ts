import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { whatsappSettingsSchema } from "@/lib/crm/validation";
import { randomBytes } from "crypto";

export const GET = withApiHandler(
  { logTag: "WhatsApp" },
  async (_request, ctx) => {
    const supabase = createSupabaseAdmin();
    const { data: team } = await supabase
      .from("teams")
      .select("settings")
      .eq("id", ctx.workspaceId)
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
  }
);

export const POST = withApiHandler(
  {
    bodySchema: whatsappSettingsSchema,
    logTag: "WhatsApp",
  },
  async (_request, ctx, { body }) => {
    // Only owner / admin should save settings
    if (!ctx.isOwner) {
      return NextResponse.json({ success: false, error: "Only admins can update integrations" }, { status: 403 });
    }

    const supabase = createSupabaseAdmin();

    // Get existing settings
    const { data: team } = await supabase
      .from("teams")
      .select("settings")
      .eq("id", ctx.workspaceId)
      .single();

    const existingSettings = (team?.settings || {}) as Record<string, unknown>;

    // Auto-generate verify token if not provided
    const webhookVerifyToken = body.webhook_verify_token || randomBytes(16).toString("hex");

    // Keep existing access_token if not provided
    const existingWa = existingSettings.whatsapp as Record<string, unknown> | undefined;
    const accessToken = body.access_token || (existingWa?.access_token as string) || "";

    if (!accessToken) {
      return NextResponse.json({ success: false, error: "Access token is required" }, { status: 400 });
    }

    const newSettings = {
      ...existingSettings,
      whatsapp: {
        phone_number_id: body.phone_number_id,
        waba_id: body.waba_id,
        access_token: accessToken,
        webhook_verify_token: webhookVerifyToken,
        is_connected: false,
      },
    };

    const { error: updateError } = await supabase
      .from("teams")
      .update({ settings: newSettings })
      .eq("id", ctx.workspaceId);

    if (updateError) throw new ApiError(updateError.message, 500);

    return NextResponse.json({
      success: true,
      data: {
        phone_number_id: body.phone_number_id,
        waba_id: body.waba_id,
        webhook_verify_token: webhookVerifyToken,
      },
    });
  }
);
