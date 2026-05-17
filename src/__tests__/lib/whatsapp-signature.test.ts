import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { buildHubSignatureHeader, verifyHubSignature } from "@/lib/whatsapp/signature";

describe("whatsapp/signature", () => {
  const secret = "test-secret-1234567890";
  const body = JSON.stringify({ object: "whatsapp_business_account", entry: [] });

  it("verifies a correctly signed body", () => {
    const header = buildHubSignatureHeader(body, secret);
    expect(verifyHubSignature({ rawBody: body, signatureHeader: header, appSecret: secret })).toBe(true);
  });

  it("rejects when secret differs", () => {
    const header = buildHubSignatureHeader(body, secret);
    expect(verifyHubSignature({ rawBody: body, signatureHeader: header, appSecret: "other-secret" })).toBe(false);
  });

  it("rejects when body differs", () => {
    const header = buildHubSignatureHeader(body, secret);
    expect(verifyHubSignature({ rawBody: body + "tampered", signatureHeader: header, appSecret: secret })).toBe(false);
  });

  it("rejects missing header", () => {
    expect(verifyHubSignature({ rawBody: body, signatureHeader: null, appSecret: secret })).toBe(false);
  });

  it("rejects malformed header", () => {
    expect(verifyHubSignature({ rawBody: body, signatureHeader: "garbage", appSecret: secret })).toBe(false);
    expect(verifyHubSignature({ rawBody: body, signatureHeader: "sha1=abcdef", appSecret: secret })).toBe(false);
    expect(verifyHubSignature({ rawBody: body, signatureHeader: "sha256=", appSecret: secret })).toBe(false);
  });

  it("uses timing-safe equality on mismatched but same-length hexes", () => {
    // Same length, different content → still rejected
    const sameLenWrong = "sha256=" + crypto.randomBytes(32).toString("hex");
    expect(verifyHubSignature({ rawBody: body, signatureHeader: sameLenWrong, appSecret: secret })).toBe(false);
  });

  it("handles UTF-8 raw body bytes", () => {
    const utf8Body = JSON.stringify({ text: "Привет мир 你好" });
    const header = buildHubSignatureHeader(utf8Body, secret);
    expect(verifyHubSignature({ rawBody: utf8Body, signatureHeader: header, appSecret: secret })).toBe(true);
  });

  it("is case-insensitive on sha256 prefix", () => {
    const header = buildHubSignatureHeader(body, secret).replace("sha256=", "SHA256=");
    expect(verifyHubSignature({ rawBody: body, signatureHeader: header, appSecret: secret })).toBe(true);
  });
});
