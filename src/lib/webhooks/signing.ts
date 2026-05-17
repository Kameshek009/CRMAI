import crypto from "crypto";
import { encryptToken, decryptToken } from "@/lib/api-auth/token-crypto";

/**
 * Signs a raw webhook body with HMAC-SHA256.
 *
 * The receiving side reproduces this by computing
 *   sha256 = HMAC-SHA256(secret, raw_request_body)
 * and comparing constant-time to the value of the `X-Nexxus-Signature`
 * header (which we send as `sha256=<hex>`).
 *
 * The receiver MUST use the raw body it actually received (NOT a
 * re-serialised JSON), or signatures will not match.
 */
export function signWebhookBody(secret: string, body: string): string {
  return `sha256=${crypto.createHmac("sha256", secret).update(body).digest("hex")}`;
}

export function verifyWebhookSignature(secret: string, body: string, signatureHeader: string): boolean {
  const expected = signWebhookBody(secret, body);
  if (expected.length !== signatureHeader.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
}

/**
 * Generates a fresh webhook signing secret and its AES-256-GCM ciphertext.
 *
 * The plaintext is shown to the user ONCE on endpoint creation so they can
 * verify our deliveries on their side. The DB stores only `encrypted` (see
 * migration 053); the dispatcher decrypts at send time to compute the HMAC.
 */
export function generateWebhookSecret(): { plaintext: string; encrypted: string } {
  const plaintext = `whsec_${crypto.randomBytes(24).toString("base64url")}`;
  return { plaintext, encrypted: encryptToken(plaintext) };
}

export function decryptWebhookSecret(encrypted: string): string {
  return decryptToken(encrypted);
}
