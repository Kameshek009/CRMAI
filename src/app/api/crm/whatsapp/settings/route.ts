import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/crm/with-api-handler";
import { whatsappSettingsSchema } from "@/lib/crm/validation";
import { randomBytes } from "crypto";
import {
  getWhatsAppSettingsRow,
  upsertWhatsAppSettings,
  maskEncryptedToken,
  MIGRATION_PLAINTEXT_PREFIX,
} from "@/lib/whatsapp/store";

export const GET = withApiHandler(
  { logTag: "WhatsApp" },
  async (_request, ctx) => {
    const row = await getWhatsAppSettingsRow(ctx.workspaceId);
    if (!row) {
      return NextResponse.json({ success: true, data: null });
    }
    return NextResponse.json({
      success: true,
      data: {
        phone_number_id: row.phone_number_id,
        waba_id: row.waba_id,
        access_token_masked: maskEncryptedToken(row.access_token_encrypted),
        app_secret_set: Boolean(row.app_secret_encrypted),
        webhook_verify_token: row.webhook_verify_token,
        is_connected: row.is_connected,
        origin: row.origin,
        display_name: row.display_name,
        needs_resave: row.access_token_encrypted.startsWith(MIGRATION_PLAINTEXT_PREFIX),
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
    if (!ctx.isOwner) {
      return NextResponse.json(
        { success: false, error: "Only admins can update integrations" },
        { status: 403 },
      );
    }

    const existing = await getWhatsAppSettingsRow(ctx.workspaceId);

    let accessToken = body.access_token;
    if (!accessToken) {
      // Keep existing token if not provided AND the existing row is not in
      // pre-migration plaintext (where we'd need a fresh save anyway).
      if (
        existing &&
        !existing.access_token_encrypted.startsWith(MIGRATION_PLAINTEXT_PREFIX)
      ) {
        const { decryptToken } = await import("@/lib/api-auth/token-crypto");
        try {
          accessToken = decryptToken(existing.access_token_encrypted);
        } catch {
          // Fall through to error below.
        }
      }
    }
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: "Access token is required" },
        { status: 400 },
      );
    }

    const webhookVerifyToken =
      body.webhook_verify_token || existing?.webhook_verify_token || randomBytes(16).toString("hex");

    const row = await upsertWhatsAppSettings({
      teamId: ctx.workspaceId,
      phoneNumberId: body.phone_number_id,
      wabaId: body.waba_id,
      accessToken,
      appSecret: body.app_secret ?? undefined,
      webhookVerifyToken,
      origin: existing?.origin ?? "byo",
    });

    return NextResponse.json({
      success: true,
      data: {
        phone_number_id: row.phone_number_id,
        waba_id: row.waba_id,
        webhook_verify_token: row.webhook_verify_token,
      },
    });
  }
);
