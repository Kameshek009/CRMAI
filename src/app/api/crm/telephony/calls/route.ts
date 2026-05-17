import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import {
  getTelephonyCredentials,
  getTelephonySettings,
} from "@/lib/telephony/store";
import { getTelephonyProvider } from "@/lib/telephony/registry";
import { logger } from "@/lib/logger";

const placeCallSchema = z.object({
  to_number: z.string().regex(/^\+\d{6,15}$/),
  contact_id: z.string().uuid().nullable().optional(),
  lead_id: z.string().uuid().nullable().optional(),
  deal_id: z.string().uuid().nullable().optional(),
  /** Optional summary the agent jots before the call. */
  summary: z.string().max(2000).optional(),
  record: z.boolean().optional(),
});

/**
 * POST /api/crm/telephony/calls
 *
 * Click-to-call: creates a pending `call_logs` row, asks the provider to
 * place an outbound call, and links the provider's call id back. Status
 * updates flow through /api/webhooks/twilio/voice and update the row in
 * place.
 *
 * Provider is gated by `team_settings.manage` permission for now — we'll
 * loosen to `contacts.update` once telephony graduates from beta.
 */
export const POST = withApiHandler(
  {
    permission: { resource: "team_settings", action: "manage" },
    bodySchema: placeCallSchema,
    logTag: "Telephony",
  },
  async (_request, ctx, { body }) => {
    const settings = await getTelephonySettings(ctx.workspaceId);
    if (!settings) {
      throw new ApiError("Telephony is not configured for this workspace", 400);
    }
    const provider = getTelephonyProvider(settings.provider);
    if (!provider) {
      throw new ApiError(`Telephony provider ${settings.provider} is not yet implemented`, 501);
    }
    const credentials = await getTelephonyCredentials(ctx.workspaceId);
    if (!credentials) {
      throw new ApiError("Telephony credentials missing", 400);
    }

    const supabase = createSupabaseAdmin();
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");

    // Pre-flight insert so the webhook can find the row by provider_call_id once the call lands.
    const { data: pending, error: insertError } = await supabase
      .from("call_logs")
      .insert({
        team_id: ctx.workspaceId,
        account_id: ctx.accountId,
        caller_account_id: ctx.accountId,
        contact_id: body.contact_id ?? null,
        lead_id: body.lead_id ?? null,
        deal_id: body.deal_id ?? null,
        direction: "outbound",
        status: "initiated",
        from_number: credentials.fromNumber,
        to_number: body.to_number,
        summary: body.summary ?? null,
        provider: settings.provider,
      })
      .select("id")
      .single();
    if (insertError || !pending) {
      throw new ApiError(`call_logs insert failed: ${insertError?.message ?? "unknown"}`, 500);
    }

    try {
      const result = await provider.initiateCall(credentials, {
        toNumber: body.to_number,
        twimlUrl: `${appUrl}/api/webhooks/twilio/voice/twiml`,
        statusCallbackUrl: `${appUrl}/api/webhooks/twilio/voice`,
        record: body.record ?? false,
      });
      await supabase
        .from("call_logs")
        .update({ provider_call_id: result.callId })
        .eq("id", pending.id);
      return NextResponse.json({
        success: true,
        data: { call_log_id: pending.id, provider_call_id: result.callId, status: result.status },
      });
    } catch (e) {
      logger.error("Telephony", "initiateCall failed", e);
      await supabase
        .from("call_logs")
        .update({ status: "failed", summary: e instanceof Error ? e.message : String(e) })
        .eq("id", pending.id);
      throw new ApiError(`Telephony call failed: ${e instanceof Error ? e.message : "unknown"}`, 502);
    }
  },
);
