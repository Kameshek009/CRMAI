import crypto from "crypto";

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
 * Generates a fresh webhook signing secret for a new endpoint.
 * Shown to the user ONCE; the DB stores only the hash.
 */
export function generateWebhookSecret(): { plaintext: string; hash: string } {
  const plaintext = `whsec_${crypto.randomBytes(24).toString("base64url")}`;
  const hash = crypto.createHash("sha256").update(plaintext).digest("hex");
  return { plaintext, hash };
}
