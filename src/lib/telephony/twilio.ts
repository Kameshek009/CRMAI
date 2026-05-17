/**
 * Twilio implementation of the TelephonyProvider interface.
 *
 * docs: https://www.twilio.com/docs/voice/make-calls
 *       https://www.twilio.com/docs/usage/security
 *
 * Why direct fetch (no `twilio` SDK): the SDK is ~5MB and pulls in
 * jsonwebtoken/openpgp/etc. We only need to POST to the Calls API and
 * verify a SHA-1 HMAC for webhook signatures, both of which are 30 LoC.
 */

import crypto from "crypto";
import type {
  InitiateCallInput,
  InitiateCallResult,
  TelephonyCredentials,
  TelephonyProvider,
} from "./types";

const TWILIO_BASE = "https://api.twilio.com/2010-04-01";

async function postCall(creds: TelephonyCredentials, body: URLSearchParams): Promise<{ sid: string; status: string }> {
  const auth = creds.apiKeySid && creds.apiKeySecret
    ? `${creds.apiKeySid}:${creds.apiKeySecret}`
    : `${creds.accountSid}:${creds.authToken}`;
  const res = await fetch(`${TWILIO_BASE}/Accounts/${encodeURIComponent(creds.accountSid)}/Calls.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(auth).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Twilio Calls.create failed (${res.status}): ${text.slice(0, 500)}`);
  }
  const json = (await res.json()) as { sid: string; status: string };
  return { sid: json.sid, status: json.status };
}

async function initiateCall(
  creds: TelephonyCredentials,
  input: InitiateCallInput,
): Promise<InitiateCallResult> {
  const body = new URLSearchParams({
    To: input.toNumber,
    From: creds.fromNumber,
    Url: input.twimlUrl,
    StatusCallback: input.statusCallbackUrl,
    StatusCallbackEvent: input.statusCallbackEvents ?? "initiated ringing answered completed",
    StatusCallbackMethod: "POST",
  });
  if (input.record) body.set("Record", "true");
  const result = await postCall(creds, body);
  return { callId: result.sid, status: result.status };
}

/**
 * Twilio signs requests with SHA-1 HMAC:
 *   key = auth_token
 *   data = full_url + sorted(param_name + param_value).join("")
 * Base64-encoded result must match the X-Twilio-Signature header.
 *
 * docs: https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */
function verifyWebhookSignature(args: {
  creds: TelephonyCredentials;
  rawBody: string;
  signatureHeader: string | null;
  requestUrl: string;
  params: Record<string, string>;
}): boolean {
  if (!args.signatureHeader) return false;
  const sortedKeys = Object.keys(args.params).sort();
  const data = args.requestUrl + sortedKeys.map((k) => k + args.params[k]).join("");
  const expected = crypto
    .createHmac("sha1", args.creds.authToken)
    .update(data, "utf8")
    .digest("base64");
  if (expected.length !== args.signatureHeader.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(args.signatureHeader));
}

function mapStatus(providerStatus: string): "initiated" | "completed" | "missed" | "failed" | "no_answer" | null {
  const s = providerStatus.toLowerCase();
  if (s === "queued" || s === "initiated" || s === "ringing" || s === "in-progress") return "initiated";
  if (s === "completed") return "completed";
  if (s === "no-answer") return "no_answer";
  if (s === "busy" || s === "canceled") return "missed";
  if (s === "failed") return "failed";
  return null;
}

export const twilioProvider: TelephonyProvider = {
  id: "twilio",
  label: "Twilio",
  initiateCall,
  verifyWebhookSignature,
  mapStatus,
};
