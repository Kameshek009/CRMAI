/**
 * Verify Meta's webhook signature: SHA-256 HMAC over the raw request body,
 * with the per-app secret as the key. Header is `X-Hub-Signature-256:
 * sha256=<hex>`.
 *
 * We MUST hash the raw bytes (not the parsed JSON) because Meta's signature
 * is over their serialisation, which may differ from `JSON.stringify(JSON.parse(body))`.
 */

import crypto from "crypto";

export interface VerifyHubSignatureOptions {
  rawBody: string;
  signatureHeader: string | null;
  appSecret: string;
}

export function verifyHubSignature(options: VerifyHubSignatureOptions): boolean {
  const { rawBody, signatureHeader, appSecret } = options;
  if (!signatureHeader) return false;
  const m = /^sha256=([a-f0-9]+)$/i.exec(signatureHeader.trim());
  if (!m || !m[1]) return false;
  const provided = Buffer.from(m[1], "hex");
  const expected = crypto.createHmac("sha256", appSecret).update(rawBody).digest();
  if (provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(provided, expected);
}

/** Compute the header value matching `verifyHubSignature` — useful for tests. */
export function buildHubSignatureHeader(rawBody: string, appSecret: string): string {
  return `sha256=${crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
}
