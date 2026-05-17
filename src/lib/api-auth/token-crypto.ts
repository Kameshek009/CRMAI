import crypto from "crypto";

/**
 * AES-256-GCM helpers used to encrypt OAuth tokens before they go into the
 * `oauth_tokens` table. The DB column is base64(iv || tag || ciphertext).
 *
 * Env var `TOKEN_ENCRYPTION_KEY` must be a base64-encoded 32-byte key in
 * production. For local development and CI we derive a deterministic key
 * from a fixed string so tests can run without configuration; a deployment
 * with this default would fail to read tokens after the env var is set, so
 * production deploys MUST set their own key.
 */

const ALGO = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;

function loadKey(): Buffer {
  const env = process.env.TOKEN_ENCRYPTION_KEY;
  if (env) {
    const buf = Buffer.from(env, "base64");
    if (buf.length !== 32) {
      throw new Error(`TOKEN_ENCRYPTION_KEY must decode to 32 bytes, got ${buf.length}`);
    }
    return buf;
  }
  // Deterministic dev fallback. Distinct from any production key.
  return crypto.createHash("sha256").update("nexxus:dev:token-encryption:v1").digest();
}

let cachedKey: Buffer | null = null;
function key(): Buffer {
  if (!cachedKey) cachedKey = loadKey();
  return cachedKey;
}

export function encryptToken(plaintext: string): string {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGO, key(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString("base64");
}

export function decryptToken(payload: string): string {
  const buf = Buffer.from(payload, "base64");
  if (buf.length < IV_BYTES + TAG_BYTES) {
    throw new Error("Encrypted token payload too short");
  }
  const iv = buf.subarray(0, IV_BYTES);
  const tag = buf.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ct = buf.subarray(IV_BYTES + TAG_BYTES);
  const decipher = crypto.createDecipheriv(ALGO, key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

/** @internal — exposed for tests to reset cached key after manipulating env. */
export function __resetTokenCryptoCache(): void {
  cachedKey = null;
}
