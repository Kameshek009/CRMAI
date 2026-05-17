/**
 * AmoCRM (Kommo) OAuth 2.0 — universal authorize, subdomain-specific token.
 *
 * Authorize URL is `https://www.amocrm.com/oauth` (no subdomain). After the
 * user grants access, AmoCRM redirects back to our callback with:
 *   ?code=...&state=...&referer=<subdomain>.amocrm.ru&client_id=...
 *
 * The subdomain is what we then use as the API base for token exchange and
 * all subsequent calls: `https://<subdomain>.amocrm.ru/oauth2/access_token`.
 *
 * docs: https://www.amocrm.com/developers/content/oauth/step-by-step
 */

const AMOCRM_AUTHORIZE_URL = "https://www.amocrm.com/oauth";

export interface AmoCRMOAuthConfig {
  integrationId: string;
  secretKey: string;
  redirectUri: string;
}

export function getAmoCRMOAuthConfig(): AmoCRMOAuthConfig {
  const integrationId = process.env.AMOCRM_INTEGRATION_ID;
  const secretKey = process.env.AMOCRM_SECRET_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!integrationId || !secretKey || !appUrl) {
    throw new Error("AMOCRM_INTEGRATION_ID/SECRET_KEY + NEXT_PUBLIC_APP_URL must be configured");
  }
  return {
    integrationId,
    secretKey,
    redirectUri: `${appUrl.replace(/\/$/, "")}/api/oauth/importers/amocrm/callback`,
  };
}

export function isAmoCRMConfigured(): boolean {
  return Boolean(
    process.env.AMOCRM_INTEGRATION_ID &&
      process.env.AMOCRM_SECRET_KEY &&
      process.env.NEXT_PUBLIC_APP_URL,
  );
}

export function buildAmoCRMAuthorizeUrl(state: string): string {
  const { integrationId } = getAmoCRMOAuthConfig();
  const params = new URLSearchParams({
    client_id: integrationId,
    state,
    mode: "post_message",
  });
  return `${AMOCRM_AUTHORIZE_URL}?${params.toString()}`;
}

export interface AmoCRMTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  subdomain: string;
}

interface RawAmoCRMTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export async function exchangeAmoCRMCode(args: {
  code: string;
  subdomain: string;
}): Promise<AmoCRMTokenResponse> {
  const { integrationId, secretKey, redirectUri } = getAmoCRMOAuthConfig();
  const url = `https://${args.subdomain}/oauth2/access_token`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: integrationId,
      client_secret: secretKey,
      grant_type: "authorization_code",
      code: args.code,
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AmoCRM token exchange failed (${res.status}): ${text}`);
  }
  const json = (await res.json()) as RawAmoCRMTokenResponse;
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresIn: json.expires_in,
    subdomain: args.subdomain,
  };
}

export async function refreshAmoCRMToken(args: {
  refreshToken: string;
  subdomain: string;
}): Promise<AmoCRMTokenResponse> {
  const { integrationId, secretKey, redirectUri } = getAmoCRMOAuthConfig();
  const url = `https://${args.subdomain}/oauth2/access_token`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: integrationId,
      client_secret: secretKey,
      grant_type: "refresh_token",
      refresh_token: args.refreshToken,
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AmoCRM token refresh failed (${res.status}): ${text}`);
  }
  const json = (await res.json()) as RawAmoCRMTokenResponse;
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresIn: json.expires_in,
    subdomain: args.subdomain,
  };
}

/**
 * Validate that the `referer` query param from the callback is an AmoCRM
 * subdomain (covers .amocrm.ru, .amocrm.com, .kommo.com). Prevents code
 * exchange against an attacker-controlled host.
 */
export function isValidAmoCRMSubdomain(subdomain: string | null | undefined): subdomain is string {
  if (!subdomain) return false;
  return /^[a-z0-9-]+\.(amocrm\.ru|amocrm\.com|kommo\.com)$/i.test(subdomain);
}
