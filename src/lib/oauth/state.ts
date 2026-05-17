/**
 * Stateless CSRF protection for the OAuth dance.
 *
 * We generate a random `state` value, drop it as an HttpOnly cookie, and
 * include it in the `state` URL param sent to Google. On callback we compare
 * the URL param to the cookie. Mismatch → reject. This prevents a malicious
 * page from tricking the user into completing an OAuth flow for an attacker
 * account.
 *
 * The cookie also carries a `return_to` path so we can send the user back to
 * the originating settings page. Encoded as `<state>:<base64url(returnTo)>`.
 */

import crypto from "crypto";

export const STATE_COOKIE_NAME = "nx_oauth_state";
export const STATE_COOKIE_MAX_AGE = 600; // 10 minutes

export function generateStateValue(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function encodeStateCookie(state: string, returnTo: string): string {
  const safeReturn = Buffer.from(returnTo, "utf8").toString("base64url");
  return `${state}:${safeReturn}`;
}

export interface DecodedStateCookie {
  state: string;
  returnTo: string;
}

export function decodeStateCookie(value: string): DecodedStateCookie | null {
  const idx = value.indexOf(":");
  if (idx < 0) return null;
  const state = value.slice(0, idx);
  const encReturn = value.slice(idx + 1);
  if (!state || !encReturn) return null;
  try {
    const returnTo = Buffer.from(encReturn, "base64url").toString("utf8");
    return { state, returnTo };
  } catch {
    return null;
  }
}

/**
 * Constant-time string compare to avoid timing leaks on state validation.
 */
export function safeStateEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
}

/**
 * Whitelist `returnTo` to internal app paths so the callback can't be used to
 * bounce the user to an attacker-controlled URL.
 */
export function sanitizeReturnTo(input: string | null, fallback: string): string {
  if (!input) return fallback;
  if (!input.startsWith("/")) return fallback;
  if (input.startsWith("//")) return fallback;
  return input;
}
