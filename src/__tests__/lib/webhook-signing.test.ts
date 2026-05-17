import { describe, it, expect } from "vitest";
import {
  signWebhookBody,
  verifyWebhookSignature,
  generateWebhookSecret,
} from "@/lib/webhooks/signing";

describe("signWebhookBody", () => {
  it("returns sha256=<hex>", () => {
    const sig = signWebhookBody("secret", '{"hello":"world"}');
    expect(sig).toMatch(/^sha256=[0-9a-f]{64}$/);
  });

  it("is deterministic for the same input", () => {
    const a = signWebhookBody("secret", "body");
    const b = signWebhookBody("secret", "body");
    expect(a).toBe(b);
  });

  it("differs across different secrets or bodies", () => {
    expect(signWebhookBody("s1", "body")).not.toBe(signWebhookBody("s2", "body"));
    expect(signWebhookBody("s", "a")).not.toBe(signWebhookBody("s", "b"));
  });
});

describe("verifyWebhookSignature", () => {
  it("accepts a matching signature", () => {
    const body = '{"id":"abc"}';
    const sig = signWebhookBody("topsecret", body);
    expect(verifyWebhookSignature("topsecret", body, sig)).toBe(true);
  });

  it("rejects tampered body", () => {
    const sig = signWebhookBody("topsecret", '{"id":"abc"}');
    expect(verifyWebhookSignature("topsecret", '{"id":"xyz"}', sig)).toBe(false);
  });

  it("rejects wrong secret", () => {
    const body = '{"id":"abc"}';
    const sig = signWebhookBody("topsecret", body);
    expect(verifyWebhookSignature("othersecret", body, sig)).toBe(false);
  });

  it("returns false for malformed header without throwing", () => {
    const sig = signWebhookBody("topsecret", "x");
    expect(verifyWebhookSignature("topsecret", "x", sig.slice(0, -1))).toBe(false);
  });
});

describe("generateWebhookSecret", () => {
  it("returns a whsec_-prefixed plaintext and its sha256 hash", () => {
    const s = generateWebhookSecret();
    expect(s.plaintext).toMatch(/^whsec_/);
    expect(s.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is unique across calls", () => {
    const a = generateWebhookSecret();
    const b = generateWebhookSecret();
    expect(a.plaintext).not.toBe(b.plaintext);
  });
});
