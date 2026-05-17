import crypto from "crypto";
import { NextResponse } from "next/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { isValidUUID } from "@/lib/crm/helpers";
import { signWebhookBody, decryptWebhookSecret } from "@/lib/webhooks/signing";

const TEST_TIMEOUT_MS = 5_000;

/**
 * Synchronously delivers a webhook.test event to the endpoint and returns the
 * outcome. Records a row in webhook_deliveries (with outbox_event_id=null —
 * FK in 052 is ON DELETE SET NULL, so this is permitted).
 */
export const POST = withApiHandler(
  {
    permission: { resource: "team_settings", action: "manage" },
    logTag: "Webhooks",
  },
  async (_request, ctx, { routeParams }) => {
    const { id } = routeParams;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data: endpoint } = await supabase
      .from("webhook_endpoints")
      .select("id, url, secret_encrypted, is_active")
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .maybeSingle();

    if (!endpoint) {
      return NextResponse.json({ success: false, error: "Webhook not found" }, { status: 404 });
    }
    if (!endpoint.secret_encrypted) {
      return NextResponse.json(
        { success: false, error: "Webhook has no secret configured" },
        { status: 400 },
      );
    }

    const deliveryId = crypto.randomUUID();
    const body = {
      id: deliveryId,
      type: "webhook.test",
      occurred_at: new Date().toISOString(),
      entity: { type: "webhook", id: endpoint.id },
      data: { ping: true },
    };
    const raw = JSON.stringify(body);

    let signature: string;
    try {
      signature = signWebhookBody(decryptWebhookSecret(endpoint.secret_encrypted), raw);
    } catch (e) {
      const error = e instanceof Error ? e.message : "decrypt_failed";
      throw new ApiError(`Failed to sign test payload: ${error}`, 500);
    }

    let httpStatus: number | null = null;
    let responseBody: string | null = null;
    let error: string | null = null;
    let ok = false;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TEST_TIMEOUT_MS);
    try {
      const res = await fetch(endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Nexxus-Signature": signature,
          "X-Nexxus-Event": "webhook.test",
          "X-Nexxus-Delivery": deliveryId,
          "User-Agent": "Nexxus-Webhooks/1.0",
        },
        body: raw,
        signal: controller.signal,
      });
      httpStatus = res.status;
      try {
        responseBody = (await res.text()).slice(0, 2000) || null;
      } catch {
        responseBody = null;
      }
      ok = res.status >= 200 && res.status < 300;
      if (!ok) error = `http_${res.status}`;
    } catch (e) {
      error = e instanceof Error ? (e.name === "AbortError" ? "timeout" : e.message) : "fetch_failed";
    } finally {
      clearTimeout(timeout);
    }

    const now = new Date().toISOString();
    await supabase.from("webhook_deliveries").insert({
      endpoint_id: endpoint.id,
      outbox_event_id: null,
      event_type: "webhook.test",
      payload: body,
      http_status: httpStatus,
      response_body: responseBody,
      attempts: 1,
      delivered_at: ok ? now : null,
      failed_at: ok ? null : now,
      error,
    });
    await supabase
      .from("webhook_endpoints")
      .update({ last_delivery_at: now, last_delivery_status: ok ? "test_delivered" : error ?? "test_failed" })
      .eq("id", endpoint.id);

    return NextResponse.json({
      success: true,
      data: { ok, http_status: httpStatus, error },
    });
  },
);
