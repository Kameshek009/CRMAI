/**
 * Salesforce OAuth 2.0 (Web Server flow).
 *
 * docs: https://help.salesforce.com/s/articleView?id=sf.remoteaccess_oauth_web_server_flow.htm
 *
 * Two authorize hosts:
 *   - Production: https://login.salesforce.com
 *   - Sandbox:    https://test.salesforce.com
 *
 * The token-exchange response includes `instance_url` (the org's actual
 * REST endpoint), which we persist in oauth_tokens.metadata so subsequent
 * REST calls go to the right org host. Refresh tokens are long-lived
 * (sometimes effectively non-expiring depending on Connected App config).
 */

const PRODUCTION_HOST = "https://login.salesforce.com";
const SANDBOX_HOST = "https://test.salesforce.com";

export interface SalesforceOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export function getSalesforceOAuthConfig(): SalesforceOAuthConfig {
  const clientId = process.env.SALESFORCE_CLIENT_ID;
  const clientSecret = process.env.SALESFORCE_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!clientId || !clientSecret || !appUrl) {
    throw new Error("SALESFORCE_CLIENT_ID/SECRET + NEXT_PUBLIC_APP_URL must be configured");
  }
  return {
    clientId,
    clientSecret,
    redirectUri: `${appUrl.replace(/\/$/, "")}/api/oauth/importers/salesforce/callback`,
  };
}

export function isSalesforceConfigured(): boolean {
  return Boolean(
    process.env.SALESFORCE_CLIENT_ID &&
      process.env.SALESFORCE_CLIENT_SECRET &&
      process.env.NEXT_PUBLIC_APP_URL,
  );
}

export function buildSalesforceAuthorizeUrl(args: {
  state: string;
  environment: "production" | "sandbox";
}): string {
  const { clientId, redirectUri } = getSalesforceOAuthConfig();
  const host = args.environment === "sandbox" ? SANDBOX_HOST : PRODUCTION_HOST;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state: args.state,
    scope: "api refresh_token",
    prompt: "consent",
  });
  return `${host}/services/oauth2/authorize?${params.toString()}`;
}

export interface SalesforceTokenResponse {
  accessToken: string;
  refreshToken: string;
  instanceUrl: string;
  /** Identity URL we can hit to introspect the user/org. */
  identityUrl?: string;
  tokenType: string;
  /** Salesforce omits expires_in for some response paths — we default to 2h. */
  expiresIn: number;
}

interface RawSalesforceTokenResponse {
  access_token: string;
  refresh_token: string;
  instance_url: string;
  id?: string;
  token_type: string;
  expires_in?: number;
  issued_at?: string;
}

export async function exchangeSalesforceCode(args: {
  code: string;
  environment: "production" | "sandbox";
}): Promise<SalesforceTokenResponse> {
  const { clientId, clientSecret, redirectUri } = getSalesforceOAuthConfig();
  const host = args.environment === "sandbox" ? SANDBOX_HOST : PRODUCTION_HOST;
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code: args.code,
  });
  const res = await fetch(`${host}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Salesforce token exchange failed (${res.status}): ${text}`);
  }
  const json = (await res.json()) as RawSalesforceTokenResponse;
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    instanceUrl: json.instance_url,
    identityUrl: json.id,
    tokenType: json.token_type,
    expiresIn: json.expires_in ?? 7200,
  };
}

export async function refreshSalesforceToken(args: {
  refreshToken: string;
  environment: "production" | "sandbox";
}): Promise<SalesforceTokenResponse> {
  const { clientId, clientSecret } = getSalesforceOAuthConfig();
  const host = args.environment === "sandbox" ? SANDBOX_HOST : PRODUCTION_HOST;
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: args.refreshToken,
  });
  const res = await fetch(`${host}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Salesforce token refresh failed (${res.status}): ${text}`);
  }
  const json = (await res.json()) as RawSalesforceTokenResponse;
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? args.refreshToken,
    instanceUrl: json.instance_url,
    identityUrl: json.id,
    tokenType: json.token_type,
    expiresIn: json.expires_in ?? 7200,
  };
}

/** Validate the instance_url Salesforce gives us so we don't fetch from a random host. */
export function isValidSalesforceInstanceUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    return /\.salesforce\.com$|\.force\.com$/.test(u.hostname);
  } catch {
    return false;
  }
}
