import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { twilioProvider } from "@/lib/telephony/twilio";
import type { TelephonyCredentials } from "@/lib/telephony/types";

const creds: TelephonyCredentials = {
  accountSid: "AC1234",
  authToken: "test-auth-token-xyz",
  fromNumber: "+12025550100",
};

function buildSignature(authToken: string, requestUrl: string, params: Record<string, string>): string {
  const sortedKeys = Object.keys(params).sort();
  const data = requestUrl + sortedKeys.map((k) => k + params[k]).join("");
  return crypto.createHmac("sha1", authToken).update(data, "utf8").digest("base64");
}

describe("telephony/twilio signature", () => {
  const requestUrl = "https://example.com/api/webhooks/twilio/voice";
  const params = {
    AccountSid: "AC1234",
    CallSid: "CA-abcdef",
    CallStatus: "completed",
    CallDuration: "32",
  };

  it("verifies a correct signature", () => {
    const sig = buildSignature(creds.authToken, requestUrl, params);
    expect(
      twilioProvider.verifyWebhookSignature({
        creds,
        rawBody: "",
        signatureHeader: sig,
        requestUrl,
        params,
      }),
    ).toBe(true);
  });

  it("rejects a signature computed with a different secret", () => {
    const sig = buildSignature("wrong-secret", requestUrl, params);
    expect(
      twilioProvider.verifyWebhookSignature({
        creds,
        rawBody: "",
        signatureHeader: sig,
        requestUrl,
        params,
      }),
    ).toBe(false);
  });

  it("rejects when params change after signing", () => {
    const sig = buildSignature(creds.authToken, requestUrl, params);
    expect(
      twilioProvider.verifyWebhookSignature({
        creds,
        rawBody: "",
        signatureHeader: sig,
        requestUrl,
        params: { ...params, CallStatus: "failed" },
      }),
    ).toBe(false);
  });

  it("rejects missing header", () => {
    expect(
      twilioProvider.verifyWebhookSignature({
        creds,
        rawBody: "",
        signatureHeader: null,
        requestUrl,
        params,
      }),
    ).toBe(false);
  });

  it("rejects a signature for a different request URL", () => {
    const sig = buildSignature(creds.authToken, "https://example.com/other", params);
    expect(
      twilioProvider.verifyWebhookSignature({
        creds,
        rawBody: "",
        signatureHeader: sig,
        requestUrl,
        params,
      }),
    ).toBe(false);
  });

  it("is order-independent on params", () => {
    const sig = buildSignature(creds.authToken, requestUrl, params);
    // Build a re-ordered params object with same keys/values
    const reordered = {
      CallDuration: params.CallDuration,
      CallStatus: params.CallStatus,
      AccountSid: params.AccountSid,
      CallSid: params.CallSid,
    };
    expect(
      twilioProvider.verifyWebhookSignature({
        creds,
        rawBody: "",
        signatureHeader: sig,
        requestUrl,
        params: reordered,
      }),
    ).toBe(true);
  });
});

describe("telephony/twilio status mapping", () => {
  it.each([
    ["queued", "initiated"],
    ["initiated", "initiated"],
    ["ringing", "initiated"],
    ["in-progress", "initiated"],
    ["completed", "completed"],
    ["no-answer", "no_answer"],
    ["busy", "missed"],
    ["canceled", "missed"],
    ["failed", "failed"],
    ["unknown", null],
  ])("%s → %s", (input, expected) => {
    expect(twilioProvider.mapStatus(input)).toBe(expected);
  });
});
