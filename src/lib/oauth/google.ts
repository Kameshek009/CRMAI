/**
 * Google OAuth 2.0 client — pure functions, no DB.
 *
 * Build the authorize URL → user consents → Google redirects back with `code`
 * → we exchange for `{access_token, refresh_token, expires_in}`. Refresh is
 * needed because Gmail/Calendar access tokens live ~1 hour.
 *
 * `prompt=consent` and `access_type=offline` are both required to receive a
 * refresh_token on every authorize (Google only emits one on first consent
 * unless re-prompted). We always force consent so we can re-issue tokens if
 * the user disconnects and reconnects.
 */

import {
  DEFAULT_GOOGLE_SCOPES,
  GOOGLE_AUTHORIZE_URL,
  GOOGLE_TOKEN_URL,
  GOOGLE_REVOKE_URL,
  GOOGLE_USERINFO_URL,
  getGoogleOAuthConfig,
} from "./config";

export interface GoogleAuthorizeOptions {
  state: string;
  scopes?: readonly string[];
  loginHint?: string;
}

export function buildGoogleAuthorizeUrl(options: GoogleAuthorizeOptions): string {
  const { clientId, redirectUri } = getGoogleOAuthConfig();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: (options.scopes ?? DEFAULT_GOOGLE_SCOPES).join(" "),
    state: options.state,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
  });
  if (options.loginHint) params.set("login_hint", options.loginHint);
  return `${GOOGLE_AUTHORIZE_URL}?${params.toString()}`;
}

export interface GoogleTokenResponse {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number;
  scope: string;
  tokenType: string;
  idToken?: string;
}

interface RawGoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token?: string;
}

export async function exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig();
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Google token exchange failed (${res.status}): ${text}`);
  }
  const json = (await res.json()) as RawGoogleTokenResponse;
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiresIn: json.expires_in,
    scope: json.scope,
    tokenType: json.token_type,
    idToken: json.id_token,
  };
}

export interface RefreshedTokenResponse {
  accessToken: string;
  expiresIn: number;
  scope: string;
  tokenType: string;
}

export async function refreshAccessToken(refreshToken: string): Promise<RefreshedTokenResponse> {
  const { clientId, clientSecret } = getGoogleOAuthConfig();
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  });
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Google token refresh failed (${res.status}): ${text}`);
  }
  const json = (await res.json()) as RawGoogleTokenResponse;
  return {
    accessToken: json.access_token,
    expiresIn: json.expires_in,
    scope: json.scope,
    tokenType: json.token_type,
  };
}

export interface GoogleUserInfo {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
}

interface RawGoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
}

export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Google userinfo failed (${res.status}): ${text}`);
  }
  const json = (await res.json()) as RawGoogleUserInfo;
  return {
    sub: json.sub,
    email: json.email,
    emailVerified: json.email_verified,
    name: json.name,
    picture: json.picture,
  };
}

/**
 * Revoke a Google OAuth refresh or access token. Best-effort — Google still
 * returns 200 for unknown tokens and we don't want a failed revoke to block
 * the user from disconnecting.
 */
export async function revokeGoogleToken(token: string): Promise<void> {
  await fetch(GOOGLE_REVOKE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }).toString(),
  }).catch(() => undefined);
}

/**
 * `expires_in` from Google is seconds-from-now. Convert with a small safety
 * margin so the consumer refreshes a bit early.
 */
export function expiresInToTimestamp(expiresIn: number, marginSeconds = 60): string {
  const ms = Math.max(0, (expiresIn - marginSeconds) * 1000);
  return new Date(Date.now() + ms).toISOString();
}
