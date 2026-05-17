import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { signWebhookBody, decryptWebhookSecret } from "@/lib/webhooks/signing";
import {
  anyPatternMatches,
  nextAttemptAt,
  shouldGiveUp,
} from "@/lib/webhooks/dispatcher";

/**
 * Outbox-pattern webhook dispatcher.
 *
 * 1. Pulls pending outbox_events (processed_at IS NULL AND next_attempt_at <= now).
 * 2. For each event, finds active webhook_endpoints in the same team whose
 *    event_types pattern array matches the event_type.
 * 3. POSTs the payload with `X-Nexxus-Signature: sha256=<hex>` and records
 *    each attempt in webhook_deliveries.
 * 4. Marks the outbox_event processed if every endpoint delivered (or none
 *    matched); otherwise schedules a retry with exponential backoff.
 *
 * Triggered by Vercel Cron — schedule lives in vercel.json. Auth via
 * Bearer CRON_SECRET (same pattern as /api/cron/sequence-processor).
 */

const BATCH_SIZE = 50;
const REQUEST_TIMEOUT_MS = 10_000;

type OutboxRow = {
  id: string;
  team_id: string;
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  payload: Record<string, unknown>;
  occurred_at: string;
  attempts: number;
};

type EndpointRow = {
  id: string;
  team_id: string;
  url: string;
  secret_encrypted: string | null;
  event_types: string[] | null;
};

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();

  const { data: events, error: fetchError } = await supabase
    .from("outbox_events")
    .select("id, team_id, event_type, entity_type, entity_id, payload, occurred_at, attempts")
    .is("processed_at", null)
    .lte("next_attempt_at", new Date().toISOString())
    .order("next_attempt_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (fetchError) {
    logger.error("WebhookDispatcher", "Failed to fetch pending events", fetchError);
    return NextResponse.json({ success: false, error: "DB error" }, { status: 500 });
  }

  if (!events || events.length === 0) {
    return NextResponse.json({ success: true, processed: 0, delivered: 0, retried: 0 });
  }

  const teamIds = [...new Set(events.map((e) => e.team_id))];
  const { data: endpoints, error: endpointsError } = await supabase
    .from("webhook_endpoints")
    .select("id, team_id, url, secret_encrypted, event_types")
    .in("team_id", teamIds)
    .eq("is_active", true);

  if (endpointsError) {
    logger.error("WebhookDispatcher", "Failed to load endpoints", endpointsError);
    return NextResponse.json({ success: false, error: "DB error" }, { status: 500 });
  }

  const endpointsByTeam = new Map<string, EndpointRow[]>();
  for (const ep of (endpoints || []) as EndpointRow[]) {
    if (!endpointsByTeam.has(ep.team_id)) endpointsByTeam.set(ep.team_id, []);
    endpointsByTeam.get(ep.team_id)!.push(ep);
  }

  let delivered = 0;
  let retried = 0;
  let processed = 0;

  for (const event of events as OutboxRow[]) {
    const matchingEndpoints = (endpointsByTeam.get(event.team_id) || []).filter((ep) =>
      anyPatternMatches(ep.event_types, event.event_type),
    );

    // No subscribers — nothing to deliver, mark complete so we don't reread it.
    if (matchingEndpoints.length === 0) {
      await markProcessed(supabase, event.id);
      processed++;
      continue;
    }

    const bodyObject = {
      id: event.id,
      type: event.event_type,
      occurred_at: event.occurred_at,
      entity: { type: event.entity_type, id: event.entity_id },
      data: event.payload,
    };
    const rawBody = JSON.stringify(bodyObject);

    const results = await Promise.all(
      matchingEndpoints.map((ep) => deliverOne(supabase, event, ep, rawBody)),
    );

    const allOk = results.every((r) => r.ok);
    if (allOk) {
      await markProcessed(supabase, event.id);
      delivered += results.length;
      processed++;
    } else {
      const nextAttempts = event.attempts + 1;
      const firstError = results.find((r) => !r.ok)?.error ?? "delivery_failed";
      if (shouldGiveUp(nextAttempts)) {
        await supabase
          .from("outbox_events")
          .update({
            attempts: nextAttempts,
            last_error: `gave_up_after_${nextAttempts}_attempts: ${firstError}`,
            processed_at: new Date().toISOString(),
          })
          .eq("id", event.id);
        processed++;
      } else {
        await supabase
          .from("outbox_events")
          .update({
            attempts: nextAttempts,
            last_error: firstError,
            next_attempt_at: nextAttemptAt(nextAttempts).toISOString(),
          })
          .eq("id", event.id);
        retried++;
      }
    }
  }

  return NextResponse.json({
    success: true,
    fetched: events.length,
    processed,
    delivered,
    retried,
  });
}

async function markProcessed(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  eventId: string,
): Promise<void> {
  await supabase
    .from("outbox_events")
    .update({ processed_at: new Date().toISOString(), last_error: null })
    .eq("id", eventId);
}

type DeliveryResult = { ok: true } | { ok: false; error: string };

async function deliverOne(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  event: OutboxRow,
  endpoint: EndpointRow,
  rawBody: string,
): Promise<DeliveryResult> {
  if (!endpoint.secret_encrypted) {
    await recordDelivery(supabase, event, endpoint, {
      payload: rawBody,
      httpStatus: null,
      responseBody: null,
      error: "no_secret_configured",
    });
    return { ok: false, error: "no_secret_configured" };
  }

  let signature: string;
  try {
    const secret = decryptWebhookSecret(endpoint.secret_encrypted);
    signature = signWebhookBody(secret, rawBody);
  } catch (e) {
    const error = e instanceof Error ? e.message : "decrypt_failed";
    await recordDelivery(supabase, event, endpoint, {
      payload: rawBody,
      httpStatus: null,
      responseBody: null,
      error,
    });
    return { ok: false, error };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Nexxus-Signature": signature,
        "X-Nexxus-Event": event.event_type,
        "X-Nexxus-Delivery": event.id,
        "User-Agent": "Nexxus-Webhooks/1.0",
      },
      body: rawBody,
      signal: controller.signal,
    });

    const responseBody = await safeReadBody(res);
    const ok = res.status >= 200 && res.status < 300;
    await recordDelivery(supabase, event, endpoint, {
      payload: rawBody,
      httpStatus: res.status,
      responseBody,
      error: ok ? null : `http_${res.status}`,
      ok,
    });
    await touchEndpoint(supabase, endpoint.id, ok ? "delivered" : `http_${res.status}`);
    return ok ? { ok: true } : { ok: false, error: `http_${res.status}` };
  } catch (e) {
    const error = e instanceof Error ? (e.name === "AbortError" ? "timeout" : e.message) : "fetch_failed";
    await recordDelivery(supabase, event, endpoint, {
      payload: rawBody,
      httpStatus: null,
      responseBody: null,
      error,
    });
    await touchEndpoint(supabase, endpoint.id, error);
    return { ok: false, error };
  } finally {
    clearTimeout(timeout);
  }
}

async function recordDelivery(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  event: OutboxRow,
  endpoint: EndpointRow,
  fields: {
    payload: string;
    httpStatus: number | null;
    responseBody: string | null;
    error: string | null;
    ok?: boolean;
  },
): Promise<void> {
  const now = new Date().toISOString();
  await supabase.from("webhook_deliveries").insert({
    endpoint_id: endpoint.id,
    outbox_event_id: event.id,
    event_type: event.event_type,
    payload: JSON.parse(fields.payload),
    http_status: fields.httpStatus,
    response_body: fields.responseBody?.slice(0, 2000) ?? null,
    attempts: event.attempts + 1,
    delivered_at: fields.ok ? now : null,
    failed_at: fields.ok ? null : now,
    error: fields.error,
  });
}

async function touchEndpoint(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  endpointId: string,
  status: string,
): Promise<void> {
  await supabase
    .from("webhook_endpoints")
    .update({ last_delivery_at: new Date().toISOString(), last_delivery_status: status })
    .eq("id", endpointId);
}

async function safeReadBody(res: Response): Promise<string | null> {
  try {
    const text = await res.text();
    return text || null;
  } catch {
    return null;
  }
}
