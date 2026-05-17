/**
 * Shared interface for telephony providers. Twilio is the first impl;
 * Mango Office (RU) will plug into the same shape later.
 *
 * Why a thin interface: the UI / API surface should be provider-agnostic.
 * Switching from Twilio to Mango means swapping the runtime, not
 * rewriting the click-to-call flow or the call-logs pipeline.
 */

export type TelephonyProviderId = "twilio" | "mango";

export interface TelephonyCredentials {
  accountSid: string;
  authToken: string;
  fromNumber: string;
  /** Optional fine-grained API key pair (Twilio recommends these over auth_token). */
  apiKeySid?: string | null;
  apiKeySecret?: string | null;
}

export interface InitiateCallInput {
  /** E.164 destination, e.g. `+12025550100`. */
  toNumber: string;
  /** TwiML callback URL — Twilio fetches this when the callee answers. */
  twimlUrl: string;
  /** Webhook URL Twilio posts status updates to (queued/initiated/ringing/in-progress/completed). */
  statusCallbackUrl: string;
  /** Comma-separated subset of: initiated, ringing, answered, completed. */
  statusCallbackEvents?: string;
  /** Optional record-the-call toggle. */
  record?: boolean;
}

export interface InitiateCallResult {
  /** Provider's unique call id (Twilio CallSid). */
  callId: string;
  /** Initial status reported by the provider. */
  status: string;
}

export interface TelephonyProvider {
  id: TelephonyProviderId;
  label: string;
  /** Place an outbound call. The CRM creates a `call_logs` row pre-flight. */
  initiateCall(creds: TelephonyCredentials, input: InitiateCallInput): Promise<InitiateCallResult>;
  /**
   * Validate the signature on an inbound status webhook so callers can't
   * forge call-completion events.
   */
  verifyWebhookSignature(args: {
    creds: TelephonyCredentials;
    rawBody: string;
    signatureHeader: string | null;
    requestUrl: string;
    /** Parameters Twilio echoes back (used for signature computation). */
    params: Record<string, string>;
  }): boolean;
  /** Translate a provider-specific status to our `call_log_status` enum value. */
  mapStatus(providerStatus: string): "initiated" | "completed" | "missed" | "failed" | "no_answer" | null;
}
