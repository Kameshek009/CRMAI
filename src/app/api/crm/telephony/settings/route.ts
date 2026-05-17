import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import {
  deleteTelephonySettings,
  getTelephonySettings,
  maskEncrypted,
  upsertTelephonySettings,
} from "@/lib/telephony/store";

const upsertSchema = z.object({
  provider: z.enum(["twilio", "mango"]).optional(),
  account_sid: z.string().min(1).max(120),
  auth_token: z.string().min(1).max(500).optional(),
  from_number: z.string().regex(/^\+\d{6,15}$/),
  api_key_sid: z.string().min(1).max(120).optional(),
  api_key_secret: z.string().min(1).max(500).optional(),
});

export const GET = withApiHandler(
  { permission: { resource: "team_settings", action: "read" }, logTag: "Telephony" },
  async (_request, ctx) => {
    const row = await getTelephonySettings(ctx.workspaceId);
    if (!row) return NextResponse.json({ success: true, data: null });
    return NextResponse.json({
      success: true,
      data: {
        provider: row.provider,
        account_sid: row.account_sid,
        auth_token_masked: maskEncrypted(row.auth_token_encrypted),
        api_key_set: Boolean(row.api_key_sid_encrypted),
        from_number: row.from_number,
        is_connected: row.is_connected,
        last_verified_at: row.last_verified_at,
      },
    });
  },
);

export const POST = withApiHandler(
  {
    permission: { resource: "team_settings", action: "manage" },
    bodySchema: upsertSchema,
    logTag: "Telephony",
  },
  async (_request, ctx, { body }) => {
    const existing = await getTelephonySettings(ctx.workspaceId);

    let authToken = body.auth_token;
    if (!authToken) {
      if (existing) {
        const { decryptToken } = await import("@/lib/api-auth/token-crypto");
        try {
          authToken = decryptToken(existing.auth_token_encrypted);
        } catch {
          // fall through
        }
      }
    }
    if (!authToken) {
      throw new ApiError("Auth token is required", 400);
    }

    const row = await upsertTelephonySettings({
      teamId: ctx.workspaceId,
      provider: body.provider ?? existing?.provider ?? "twilio",
      accountSid: body.account_sid,
      authToken,
      fromNumber: body.from_number,
      apiKeySid: body.api_key_sid ?? undefined,
      apiKeySecret: body.api_key_secret ?? undefined,
    });
    return NextResponse.json({
      success: true,
      data: {
        provider: row.provider,
        account_sid: row.account_sid,
        from_number: row.from_number,
      },
    });
  },
);

export const DELETE = withApiHandler(
  { permission: { resource: "team_settings", action: "manage" }, logTag: "Telephony" },
  async (_request, ctx) => {
    await deleteTelephonySettings(ctx.workspaceId);
    return NextResponse.json({ success: true });
  },
);
