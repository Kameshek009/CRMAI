/**
 * Microsoft (Entra ID / Azure AD v2) OAuth 2.0 — covers personal Microsoft
 * accounts AND work/school accounts via the `/common` tenant.
 *
 * Scopes we ask for:
 *   - openid, email, profile, offline_access — basics + refresh token
 *   - Mail.Read — read inbox via Graph
 *   - Calendars.ReadWrite — for future calendar sync
 *
 * docs: https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow
 */

export const MS_AUTHORIZE_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
export const MS_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
export const MS_GRAPH_BASE = "https://graph.microsoft.com/v1.0";

export const MS_IDENTITY_SCOPES = ["openid", "email", "profile", "offline_access"] as const;
export const MS_MAIL_SCOPES = ["Mail.Read"] as const;
export const MS_CALENDAR_SCOPES = ["Calendars.ReadWrite"] as const;

export const DEFAULT_MS_SCOPES: readonly string[] = [
  ...MS_IDENTITY_SCOPES,
  ...MS_MAIL_SCOPES,
  ...MS_CALENDAR_SCOPES,
];

export interface MicrosoftOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export function getMicrosoftOAuthConfig(): MicrosoftOAuthConfig {
  const clientId = process.env.MICROSOFT_OAUTH_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_OAUTH_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!clientId || !clientSecret || !appUrl) {
    throw new Error("MICROSOFT_OAUTH_CLIENT_ID/SECRET + NEXT_PUBLIC_APP_URL must be configured");
  }
  return {
    clientId,
    clientSecret,
    redirectUri: `${appUrl.replace(/\/$/, "")}/api/oauth/microsoft/callback`,
  };
}

export function isMicrosoftOAuthConfigured(): boolean {
  return Boolean(
    process.env.MICROSOFT_OAUTH_CLIENT_ID &&
      process.env.MICROSOFT_OAUTH_CLIENT_SECRET &&
      process.env.NEXT_PUBLIC_APP_URL,
  );
}

export interface MicrosoftAuthorizeOptions {
  state: string;
  scopes?: readonly string[];
  loginHint?: string;
}

export function buildMicrosoftAuthorizeUrl(options: MicrosoftAuthorizeOptions): string {
  const { clientId, redirectUri } = getMicrosoftOAuthConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    response_mode: "query",
    scope: (options.scopes ?? DEFAULT_MS_SCOPES).join(" "),
    state: options.state,
    prompt: "consent",
  });
  if (options.loginHint) params.set("login_hint", options.loginHint);
  return `${MS_AUTHORIZE_URL}?${params.toString()}`;
}

export interface MicrosoftTokenResponse {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number;
  scope: string;
  tokenType: string;
  idToken?: string;
}

interface RawMicrosoftTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token?: string;
}

async function postToken(body: URLSearchParams): Promise<MicrosoftTokenResponse> {
  const res = await fetch(MS_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Microsoft token endpoint failed (${res.status}): ${text}`);
  }
  const json = (await res.json()) as RawMicrosoftTokenResponse;
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiresIn: json.expires_in,
    scope: json.scope,
    tokenType: json.token_type,
    idToken: json.id_token,
  };
}

export async function exchangeMicrosoftCode(code: string): Promise<MicrosoftTokenResponse> {
  const { clientId, clientSecret, redirectUri } = getMicrosoftOAuthConfig();
  return postToken(
    new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      scope: DEFAULT_MS_SCOPES.join(" "),
    }),
  );
}

export async function refreshMicrosoftToken(refreshToken: string): Promise<MicrosoftTokenResponse> {
  const { clientId, clientSecret } = getMicrosoftOAuthConfig();
  return postToken(
    new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      scope: DEFAULT_MS_SCOPES.join(" "),
    }),
  );
}

export interface MicrosoftUserInfo {
  id: string;
  email: string;
  displayName: string | null;
}

interface RawMicrosoftMe {
  id: string;
  userPrincipalName?: string;
  mail?: string;
  displayName?: string;
}

export async function fetchMicrosoftUserInfo(accessToken: string): Promise<MicrosoftUserInfo> {
  const res = await fetch(`${MS_GRAPH_BASE}/me?$select=id,userPrincipalName,mail,displayName`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Microsoft /me failed (${res.status}): ${text}`);
  }
  const json = (await res.json()) as RawMicrosoftMe;
  return {
    id: json.id,
    email: (json.mail || json.userPrincipalName || "").toLowerCase(),
    displayName: json.displayName ?? null,
  };
}
