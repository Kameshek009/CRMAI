/**
 * OAuth provider configuration — central place for scopes, redirect URIs,
 * and env-var lookups. Imported by `google.ts`, `tokens.ts`, and the
 * `/api/oauth/google/*` route handlers.
 *
 * Why two scope sets:
 *   - `GMAIL_SCOPES`: required to read inbox via Gmail API
 *   - `CALENDAR_SCOPES`: required to read/write Google Calendar
 *   - `IDENTITY_SCOPES`: `openid`, `email`, `profile` for user_id mapping
 * On `/start` we ask for the union — single consent screen, single token.
 */

export const GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";
export const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

export const IDENTITY_SCOPES = ["openid", "email", "profile"] as const;
export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.metadata",
] as const;
export const CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
] as const;

export const DEFAULT_GOOGLE_SCOPES: readonly string[] = [
  ...IDENTITY_SCOPES,
  ...GMAIL_SCOPES,
  ...CALENDAR_SCOPES,
];

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export function getGoogleOAuthConfig(): GoogleOAuthConfig {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!clientId || !clientSecret) {
    throw new Error(
      "GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET must be configured",
    );
  }
  if (!appUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL must be configured for OAuth redirect");
  }
  return {
    clientId,
    clientSecret,
    redirectUri: `${appUrl.replace(/\/$/, "")}/api/oauth/google/callback`,
  };
}

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_OAUTH_CLIENT_ID &&
      process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
      process.env.NEXT_PUBLIC_APP_URL,
  );
}
