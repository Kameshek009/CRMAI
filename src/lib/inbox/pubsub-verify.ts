/**
 * Verify the JWT that Google Cloud Pub/Sub attaches to push delivery
 * requests in `Authorization: Bearer <jwt>`. Without this check a stranger
 * could POST to our webhook and inject fake Gmail notifications.
 *
 * Google signs with RS256 against keys at /oauth2/v3/certs (JWKS) — keys
 * rotate ~daily, so we fetch + cache for a short window. The token is
 * usually a service-account ID token: `iss` is one of
 * `accounts.google.com` or `https://accounts.google.com`, `aud` matches
 * the audience configured on the subscription, and `email` is the SA
 * email.
 */

import jwt, { type JwtPayload } from "jsonwebtoken";

interface JwkRsa {
  kty: "RSA";
  use?: string;
  kid: string;
  n: string;
  e: string;
  alg?: string;
}

interface JwksResponse {
  keys: JwkRsa[];
}

const JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1h

let cache: { keys: Map<string, JwkRsa>; expiresAt: number } | null = null;

async function fetchKeys(): Promise<Map<string, JwkRsa>> {
  if (cache && cache.expiresAt > Date.now()) return cache.keys;
  const res = await fetch(JWKS_URL);
  if (!res.ok) {
    throw new Error(`pubsub-verify: JWKS fetch failed (${res.status})`);
  }
  const body = (await res.json()) as JwksResponse;
  const map = new Map<string, JwkRsa>();
  for (const k of body.keys) map.set(k.kid, k);
  cache = { keys: map, expiresAt: Date.now() + CACHE_TTL_MS };
  return map;
}

/** @internal exposed for tests */
export function __resetPubsubJwksCache(): void {
  cache = null;
}

/** @internal exposed for tests */
export function __setPubsubJwksCache(keys: Map<string, JwkRsa>): void {
  cache = { keys, expiresAt: Date.now() + CACHE_TTL_MS };
}

function jwkToPem(jwk: JwkRsa): string {
  const modulus = Buffer.from(jwk.n, "base64url");
  const exponent = Buffer.from(jwk.e, "base64url");

  // Minimal DER encoder for SubjectPublicKeyInfo RSA key — enough for jsonwebtoken to accept PEM.
  function encodeLength(len: number): Buffer {
    if (len < 0x80) return Buffer.from([len]);
    const buf: number[] = [];
    let v = len;
    while (v > 0) {
      buf.unshift(v & 0xff);
      v >>= 8;
    }
    return Buffer.from([0x80 | buf.length, ...buf]);
  }
  function encodeInteger(bytes: Buffer): Buffer {
    const needsPad = (bytes[0] ?? 0) >= 0x80;
    const value = needsPad ? Buffer.concat([Buffer.from([0]), bytes]) : bytes;
    return Buffer.concat([Buffer.from([0x02]), encodeLength(value.length), value]);
  }
  function encodeSequence(parts: Buffer[]): Buffer {
    const content = Buffer.concat(parts);
    return Buffer.concat([Buffer.from([0x30]), encodeLength(content.length), content]);
  }
  function encodeBitString(content: Buffer): Buffer {
    const value = Buffer.concat([Buffer.from([0x00]), content]);
    return Buffer.concat([Buffer.from([0x03]), encodeLength(value.length), value]);
  }

  const rsaPublicKey = encodeSequence([encodeInteger(modulus), encodeInteger(exponent)]);
  // rsaEncryption OID 1.2.840.113549.1.1.1
  const algorithm = encodeSequence([
    Buffer.from([0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01]),
    Buffer.from([0x05, 0x00]),
  ]);
  const spki = encodeSequence([algorithm, encodeBitString(rsaPublicKey)]);
  const b64 = spki.toString("base64").replace(/(.{64})/g, "$1\n");
  return `-----BEGIN PUBLIC KEY-----\n${b64}\n-----END PUBLIC KEY-----\n`;
}

export interface PubsubVerifyOptions {
  audience: string;
  /** Service-account email of the principal that pushes Pub/Sub messages — optional but recommended. */
  expectedEmail?: string;
}

export interface PubsubJwtClaims extends JwtPayload {
  email?: string;
  email_verified?: boolean;
}

export async function verifyPubsubJwt(
  token: string,
  options: PubsubVerifyOptions,
): Promise<PubsubJwtClaims> {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || typeof decoded === "string" || !decoded.header.kid) {
    throw new Error("pubsub-verify: malformed JWT");
  }
  const keys = await fetchKeys();
  const jwk = keys.get(decoded.header.kid);
  if (!jwk) {
    throw new Error(`pubsub-verify: unknown kid ${decoded.header.kid}`);
  }
  const pem = jwkToPem(jwk);
  const claims = jwt.verify(token, pem, {
    algorithms: ["RS256"],
    audience: options.audience,
    issuer: ["accounts.google.com", "https://accounts.google.com"],
  }) as PubsubJwtClaims;
  if (options.expectedEmail && claims.email !== options.expectedEmail) {
    throw new Error("pubsub-verify: email claim mismatch");
  }
  if (options.expectedEmail && claims.email_verified === false) {
    throw new Error("pubsub-verify: email_verified is false");
  }
  return claims;
}
