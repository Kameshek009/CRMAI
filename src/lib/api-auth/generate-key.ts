import crypto from "crypto";

const PREFIX = "nxk_live_";

export interface GeneratedApiKey {
  /** Plaintext token to show to the user ONCE. Never log, never store. */
  plaintext: string;
  /** First 16 chars — safe to store and display in lists for identification. */
  prefix: string;
  /** sha256(plaintext) — stored in the database; the only way to verify the key. */
  hash: string;
}

export function generateApiKey(): GeneratedApiKey {
  const random = crypto.randomBytes(32).toString("base64url");
  const plaintext = `${PREFIX}${random}`;
  return {
    plaintext,
    prefix: plaintext.slice(0, 16),
    hash: hashApiKey(plaintext),
  };
}

export function hashApiKey(plaintext: string): string {
  return crypto.createHash("sha256").update(plaintext).digest("hex");
}

export function isApiKeyShape(token: string): boolean {
  return typeof token === "string" && token.startsWith(PREFIX) && token.length >= PREFIX.length + 32;
}
