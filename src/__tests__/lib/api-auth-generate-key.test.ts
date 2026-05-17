import { describe, it, expect } from "vitest";
import { generateApiKey, hashApiKey, isApiKeyShape } from "@/lib/api-auth/generate-key";

describe("generateApiKey", () => {
  it("returns plaintext, prefix, and hash", () => {
    const key = generateApiKey();
    expect(key.plaintext).toMatch(/^nxk_live_/);
    expect(key.prefix).toHaveLength(16);
    expect(key.prefix).toBe(key.plaintext.slice(0, 16));
    expect(key.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("plaintext is unique across calls", () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a.plaintext).not.toBe(b.plaintext);
    expect(a.hash).not.toBe(b.hash);
  });

  it("hash is deterministic for the same plaintext", () => {
    const k = generateApiKey();
    expect(hashApiKey(k.plaintext)).toBe(k.hash);
  });
});

describe("isApiKeyShape", () => {
  it("accepts well-formed keys", () => {
    expect(isApiKeyShape(generateApiKey().plaintext)).toBe(true);
  });

  it("rejects wrong prefix", () => {
    expect(isApiKeyShape("sk_live_abcdef0123456789")).toBe(false);
    expect(isApiKeyShape("Bearer nxk_live_abc")).toBe(false);
  });

  it("rejects too-short tokens", () => {
    expect(isApiKeyShape("nxk_live_abc")).toBe(false);
  });

  it("rejects non-string inputs", () => {
    // @ts-expect-error — testing runtime safety
    expect(isApiKeyShape(undefined)).toBe(false);
    // @ts-expect-error
    expect(isApiKeyShape(123)).toBe(false);
  });
});
