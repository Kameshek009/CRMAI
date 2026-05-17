/**
 * Bitrix24 Cloud OAuth 2.0.
 *
 * Multi-tenant: each customer connects their own `<portal>.bitrix24.ru`.
 * The authorize redirect happens at the *portal-level* URL, but token
 * exchange goes through Bitrix's centralized OAuth server
 * `https://oauth.bitrix.info/oauth/token/`. After token exchange the
 * portal domain is returned in the response and we use it as the API
 * base for all subsequent REST calls.
 *
 * docs: https://training.bitrix24.com/rest_help/oauth/general.php
 *
 * Tokens expire in 1 hour. Our generic getValidAccessToken() handles
 * the refresh, but the refresh URL needs to be called with grant_type
 * = refresh_token. We provide that adapter here.
 */

const BITRIX_OAUTH_TOKEN_URL = "https://oauth.bitrix.info/oauth/token/";

export interface Bitrix24OAuthConfig {
  clientId: string;
  clientSecret: string;
}

export function getBitrix24OAuthConfig(): Bitrix24OAuthConfig {
  const clientId = process.env.BITRIX24_CLIENT_ID;
  const clientSecret = process.env.BITRIX24_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("BITRIX24_CLIENT_ID and BITRIX24_CLIENT_SECRET must be configured");
  }
  return { clientId, clientSecret };
}

export function isBitrix24Configured(): boolean {
  return Boolean(process.env.BITRIX24_CLIENT_ID && process.env.BITRIX24_CLIENT_SECRET);
}

/**
 * The portal authorise URL is per-domain because Bitrix24 doesn't have a
 * universal "pick your portal" page like AmoCRM. We ask the user for
 * their portal domain in the UI and build the URL on the fly.
 */
export function buildBitrix24AuthorizeUrl(args: {
  portalDomain: string;
  state: string;
  redirectUri: string;
}): string {
  const { clientId } = getBitrix24OAuthConfig();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    state: args.state,
    redirect_uri: args.redirectUri,
  });
  const portal = args.portalDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `https://${portal}/oauth/authorize/?${params.toString()}`;
}

export interface Bitrix24TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  /** Portal domain returned by Bitrix (e.g. mycompany.bitrix24.ru). */
  domain: string;
  memberId: string;
  /** REST endpoint base — Bitrix tells us where to talk. */
  clientEndpoint: string;
  serverEndpoint: string;
}

interface RawBitrix24TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  domain: string;
  member_id: string;
  client_endpoint: string;
  server_endpoint: string;
  scope?: string;
}

export async function exchangeBitrix24Code(args: { code: string }): Promise<Bitrix24TokenResponse> {
  const { clientId, clientSecret } = getBitrix24OAuthConfig();
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code: args.code,
  });
  const res = await fetch(`${BITRIX_OAUTH_TOKEN_URL}?${params.toString()}`);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Bitrix24 token exchange failed (${res.status}): ${text}`);
  }
  const json = (await res.json()) as RawBitrix24TokenResponse;
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresIn: json.expires_in,
    domain: json.domain,
    memberId: json.member_id,
    clientEndpoint: json.client_endpoint,
    serverEndpoint: json.server_endpoint,
  };
}

export async function refreshBitrix24Token(refreshToken: string): Promise<Bitrix24TokenResponse> {
  const { clientId, clientSecret } = getBitrix24OAuthConfig();
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });
  const res = await fetch(`${BITRIX_OAUTH_TOKEN_URL}?${params.toString()}`);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Bitrix24 token refresh failed (${res.status}): ${text}`);
  }
  const json = (await res.json()) as RawBitrix24TokenResponse;
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresIn: json.expires_in,
    domain: json.domain,
    memberId: json.member_id,
    clientEndpoint: json.client_endpoint,
    serverEndpoint: json.server_endpoint,
  };
}

/**
 * Validate a Bitrix24 portal domain to prevent code exchange against an
 * attacker-controlled host. We accept the common public TLDs and exclude
 * subdomain injection via dots in the middle.
 */
export function isValidBitrix24Domain(domain: string | null | undefined): domain is string {
  if (!domain) return false;
  return /^[a-z0-9-]+\.(bitrix24\.[a-z]{2,4}|bitrix24\.com)$/i.test(domain);
}
