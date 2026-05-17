import { describe, it, expect, beforeEach } from "vitest";
import { encryptToken, decryptToken, __resetTokenCryptoCache } from "@/lib/api-auth/token-crypto";

describe("token-crypto (AES-256-GCM)", () => {
  beforeEach(() => {
    delete process.env.TOKEN_ENCRYPTION_KEY;
    __resetTokenCryptoCache();
  });

  it("round-trips ASCII plaintext", () => {
    const ct = encryptToken("ya29.access-token-example");
    expect(decryptToken(ct)).toBe("ya29.access-token-example");
  });

  it("round-trips empty string", () => {
    const ct = encryptToken("");
    expect(decryptToken(ct)).toBe("");
  });

  it("round-trips multibyte/UTF-8", () => {
    const plain = "пример токена 🪙 with spaces";
    expect(decryptToken(encryptToken(plain))).toBe(plain);
  });

  it("produces a different ciphertext on each call (IV randomness)", () => {
    const a = encryptToken("same-input");
    const b = encryptToken("same-input");
    expect(a).not.toBe(b);
  });

  it("rejects tampered ciphertext (GCM auth tag check)", () => {
    const ct = encryptToken("secret");
    const tampered = Buffer.from(ct, "base64");
    const lastIdx = tampered.length - 1;
    tampered[lastIdx] = (tampered[lastIdx]! ^ 0x01) & 0xff;
    expect(() => decryptToken(tampered.toString("base64"))).toThrow();
  });

  it("rejects too-short payload", () => {
    expect(() => decryptToken(Buffer.from("short").toString("base64"))).toThrow(
      /too short/i,
    );
  });

  it("rejects an env key of the wrong length", () => {
    process.env.TOKEN_ENCRYPTION_KEY = Buffer.from("short-key").toString("base64");
    __resetTokenCryptoCache();
    expect(() => encryptToken("anything")).toThrow(/32 bytes/);
  });

  it("uses an env-provided key when set", () => {
    process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString("base64");
    __resetTokenCryptoCache();
    const ct = encryptToken("payload");
    expect(decryptToken(ct)).toBe("payload");

    // Switch to a different key — the previous ciphertext must no longer decrypt.
    process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 2).toString("base64");
    __resetTokenCryptoCache();
    expect(() => decryptToken(ct)).toThrow();
  });
});
