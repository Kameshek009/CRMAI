import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { getTelephonyCredentials, getTelephonySettings } from "@/lib/telephony/store";
import { getTelephonyProvider } from "@/lib/telephony/registry";
import { enqueueOrLog } from "@/lib/outbox/enqueue";

/**
 * Twilio voice status callback.
 *
 * Twilio POSTs form-urlencoded data: `CallSid`, `CallStatus`,
 * `CallDuration`, `RecordingUrl`, `From`, `To`, `AccountSid`, ...
 * Plus a `X-Twilio-Signature` header signing all of it. We resolve the
 * workspace via the AccountSid (UNIQUE across telephony_settings) and
 * verify the signature against the per-team auth_token before updating
 * the matching call_logs row.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const params = parseFormUrlencoded(rawBody);
  const accountSid = params["AccountSid"];
  const callSid = params["CallSid"];
  const status = params["CallStatus"];
  if (!accountSid || !callSid) {
    return NextResponse.json({ error: "Missing AccountSid/CallSid" }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  const { data: settings } = await supabase
    .from("telephony_settings")
    .select("*")
    .eq("account_sid", accountSid)
    .maybeSingle();
  if (!settings) {
    logger.info("TwilioWebhook", "Unknown AccountSid — acking", { account_sid: accountSid });
    return NextResponse.json({ ok: true });
  }

  const credentials = await getTelephonyCredentials(settings.team_id);
  const localSettings = await getTelephonySettings(settings.team_id);
  if (!credentials || !localSettings) {
    return NextResponse.json({ ok: true });
  }
  const provider = getTelephonyProvider(localSettings.provider);
  if (!provider) {
    return NextResponse.json({ ok: true });
  }

  const signatureHeader = request.headers.get("x-twilio-signature");
  const xfProto = request.headers.get("x-forwarded-proto") ?? "https";
  const host = request.headers.get("host") ?? "";
  const requestUrl = `${xfProto}://${host}${request.nextUrl.pathname}`;
  const ok = provider.verifyWebhookSignature({
    creds: credentials,
    rawBody,
    signatureHeader,
    requestUrl,
    params,
  });
  if (!ok) {
    logger.warn("TwilioWebhook", "Invalid signature", { account_sid: accountSid });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const mappedStatus = status ? provider.mapStatus(status) : null;
  const duration = params["CallDuration"] ? Number(params["CallDuration"]) : null;
  const recordingUrl = params["RecordingUrl"] || null;

  const update: Record<string, unknown> = {};
  if (mappedStatus) update.status = mappedStatus;
  if (typeof duration === "number" && Number.isFinite(duration)) update.duration_seconds = duration;
  if (recordingUrl) update.recording_url = recordingUrl;

  if (Object.keys(update).length > 0) {
    const { data: updated } = await supabase
      .from("call_logs")
      .update(update)
      .eq("provider_call_id", callSid)
      .eq("team_id", settings.team_id)
      .select("id")
      .maybeSingle();
    if (updated?.id) {
      await enqueueOrLog(supabase, {
        teamId: settings.team_id,
        eventType: `call.${mappedStatus ?? "updated"}`,
        entityType: "call_log",
        entityId: updated.id,
        payload: {
          provider_call_id: callSid,
          status: mappedStatus,
          duration_seconds: duration,
        },
      });
    }
  }

  return NextResponse.json({ ok: true });
}

function parseFormUrlencoded(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  const params = new URLSearchParams(body);
  params.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

/**
 * Bare TwiML responder for outbound calls. Twilio fetches this URL when
 * the call connects; the simplest playable response is a `<Dial>` back
 * to the agent's number. For now we just say "Connecting your call" and
 * Twilio will end the call — the API consumer is expected to provide a
 * real TwiML endpoint via `twimlUrl` if they want a different behaviour.
 */
export async function GET() {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say>Connecting your call.</Say></Response>`;
  return new NextResponse(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}
