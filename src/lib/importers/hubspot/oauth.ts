/**
 * HubSpot OAuth 2.0 client.
 *
 * docs: https://developers.hubspot.com/docs/api/oauth-quickstart
 *
 * Scopes — we ask for read-only on the three core CRM objects we import.
 *   - crm.objects.contacts.read
 *   - crm.objects.companies.read
 *   - crm.objects.deals.read
 *   - oauth (always required by HS)
 *
 * Tokens land in the existing `oauth_tokens` table with provider='hubspot'.
 */

const HUBSPOT_AUTHORIZE_URL = "https://app.hubspot.com/oauth/authorize";
const HUBSPOT_TOKEN_URL = "https://api.hubapi.com/oauth/v1/token";

export const HUBSPOT_SCOPES = [
  "oauth",
  "crm.objects.contacts.read",
  "crm.objects.companies.read",
  "crm.objects.deals.read",
] as const;

export interface HubSpotOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export function getHubSpotOAuthConfig(): HubSpotOAuthConfig {
  const clientId = process.env.HUBSPOT_OAUTH_CLIENT_ID;
  const clientSecret = process.env.HUBSPOT_OAUTH_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!clientId || !clientSecret || !appUrl) {
    throw new Error("HUBSPOT_OAUTH_CLIENT_ID/SECRET + NEXT_PUBLIC_APP_URL must be configured");
  }
  return {
    clientId,
    clientSecret,
    redirectUri: `${appUrl.replace(/\/$/, "")}/api/oauth/importers/hubspot/callback`,
  };
}

export function isHubSpotConfigured(): boolean {
  return Boolean(
    process.env.HUBSPOT_OAUTH_CLIENT_ID &&
      process.env.HUBSPOT_OAUTH_CLIENT_SECRET &&
      process.env.NEXT_PUBLIC_APP_URL,
  );
}

export function buildHubSpotAuthorizeUrl(state: string): string {
  const { clientId, redirectUri } = getHubSpotOAuthConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: HUBSPOT_SCOPES.join(" "),
    state,
    response_type: "code",
  });
  return `${HUBSPOT_AUTHORIZE_URL}?${params.toString()}`;
}

export interface HubSpotTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  /** HubSpot hub id (numeric) — useful for surfacing which portal is connected. */
  hubId?: number;
}

interface RawHubSpotTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  hub_id?: number;
  hub_domain?: string;
}

export async function exchangeHubSpotCode(code: string): Promise<HubSpotTokenResponse> {
  const { clientId, clientSecret, redirectUri } = getHubSpotOAuthConfig();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
  });
  const res = await fetch(HUBSPOT_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HubSpot token exchange failed (${res.status}): ${text}`);
  }
  const json = (await res.json()) as RawHubSpotTokenResponse;
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresIn: json.expires_in,
    hubId: json.hub_id,
  };
}

export async function refreshHubSpotToken(refreshToken: string): Promise<HubSpotTokenResponse> {
  const { clientId, clientSecret } = getHubSpotOAuthConfig();
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });
  const res = await fetch(HUBSPOT_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HubSpot token refresh failed (${res.status}): ${text}`);
  }
  const json = (await res.json()) as RawHubSpotTokenResponse;
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresIn: json.expires_in,
    hubId: json.hub_id,
  };
}

/** HubSpot returns a `hub_info` endpoint we can hit to display the portal name. */
export interface HubInfo {
  hubId: number;
  portalId: number;
  hubDomain: string | null;
}

export async function fetchHubSpotAccountInfo(accessToken: string): Promise<HubInfo | null> {
  const res = await fetch("https://api.hubapi.com/account-info/v3/details", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { portalId: number; uiDomain?: string };
  return {
    hubId: json.portalId,
    portalId: json.portalId,
    hubDomain: json.uiDomain ?? null,
  };
}
