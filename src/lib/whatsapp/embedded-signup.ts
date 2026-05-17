/**
 * Embedded Signup for WhatsApp Cloud API.
 *
 * Operating model: a customer clicks "Connect via Meta", we open the Meta
 * dialog (Facebook Login) configured for WhatsApp Business onboarding. The
 * dialog provisions/confirms their WABA + phone, then redirects to our
 * callback with a short-lived `code`. We exchange it for a long-lived
 * System User access token scoped to that WABA, and persist into
 * `whatsapp_settings` with origin='embedded_signup'.
 *
 * Prereqs we depend on (all done in Meta side by the dev team, not in code):
 *   - Meta Business Verification approved
 *   - WhatsApp Business app added to Tech Provider Solution
 *   - Embedded Signup config_id from Meta Business Solutions Partner UI
 *   - WHATSAPP_META_APP_{ID,SECRET,CONFIG_ID} env vars set
 *
 * This module is dormant until those env vars are set; the API endpoints
 * return 503 otherwise, which the UI uses to gate the "Connect via Meta"
 * button.
 */

const META_GRAPH_VERSION = "v21.0";

export const META_LOGIN_URL = "https://www.facebook.com/v21.0/dialog/oauth";
export const META_GRAPH_BASE = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

export interface EmbeddedSignupConfig {
  appId: string;
  appSecret: string;
  /** Embedded Signup config_id provisioned in Meta Business Suite. */
  configId: string;
  redirectUri: string;
}

export function getEmbeddedSignupConfig(): EmbeddedSignupConfig | null {
  const appId = process.env.WHATSAPP_META_APP_ID;
  const appSecret = process.env.WHATSAPP_META_APP_SECRET;
  const configId = process.env.WHATSAPP_META_CONFIG_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appId || !appSecret || !configId || !appUrl) return null;
  return {
    appId,
    appSecret,
    configId,
    redirectUri: `${appUrl.replace(/\/$/, "")}/api/oauth/whatsapp/callback`,
  };
}

export function isEmbeddedSignupConfigured(): boolean {
  return getEmbeddedSignupConfig() !== null;
}

export interface BuildLoginUrlOptions {
  state: string;
  extras?: Record<string, string>;
}

/**
 * Build the Facebook Login OAuth URL targeted at the Embedded Signup
 * config. Meta's Embedded Signup is implemented as a Facebook Login
 * extension with `extras.setup` carrying the config_id (see Meta's
 * "Embedded Signup" docs).
 */
export function buildEmbeddedSignupUrl(options: BuildLoginUrlOptions): string {
  const config = getEmbeddedSignupConfig();
  if (!config) throw new Error("WhatsApp Embedded Signup is not configured");
  const params = new URLSearchParams({
    client_id: config.appId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    state: options.state,
    // Standard FB Login scopes required for the WA onboarding flow.
    scope: ["whatsapp_business_management", "whatsapp_business_messaging"].join(","),
    config_id: config.configId,
    extras: JSON.stringify({
      feature: "whatsapp_embedded_signup",
      setup: {},
      ...(options.extras ?? {}),
    }),
  });
  return `${META_LOGIN_URL}?${params.toString()}`;
}

export interface TokenExchangeResult {
  accessToken: string;
  /** Meta sometimes returns `expires_in` as a number string. */
  expiresIn: number | null;
  scope: string | null;
}

interface RawTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
}

/**
 * Exchange the short-lived code from `/oauth/whatsapp/callback` for an
 * access token. Meta's response shape is roughly the standard OAuth2 form
 * but `expires_in` is sometimes omitted (long-lived System User tokens).
 */
export async function exchangeEmbeddedSignupCode(code: string): Promise<TokenExchangeResult> {
  const config = getEmbeddedSignupConfig();
  if (!config) throw new Error("WhatsApp Embedded Signup is not configured");
  const params = new URLSearchParams({
    client_id: config.appId,
    client_secret: config.appSecret,
    redirect_uri: config.redirectUri,
    code,
  });
  const res = await fetch(`${META_GRAPH_BASE}/oauth/access_token?${params.toString()}`);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Meta token exchange failed (${res.status}): ${text}`);
  }
  const json = (await res.json()) as RawTokenResponse;
  return {
    accessToken: json.access_token,
    expiresIn: json.expires_in ?? null,
    scope: json.scope ?? null,
  };
}

/**
 * After token exchange we still need to discover which WABA + phone the
 * user just connected. `GET /debug_token` reveals granted scopes and the
 * authorising user, and `GET /me/businesses` walks to the WABA. For the
 * MVP foundation we just persist the bare access token + an empty
 * phone_number_id; the customer fills in phone_number_id in the next step
 * (or we can implement the introspection walk later).
 */
export interface IntrospectedConnection {
  phoneNumberId: string | null;
  wabaId: string | null;
  displayName: string | null;
}

export async function introspectConnection(accessToken: string): Promise<IntrospectedConnection> {
  try {
    const res = await fetch(`${META_GRAPH_BASE}/debug_token?input_token=${encodeURIComponent(accessToken)}&access_token=${encodeURIComponent(accessToken)}`);
    if (!res.ok) return { phoneNumberId: null, wabaId: null, displayName: null };
    const json = (await res.json()) as {
      data?: {
        scopes?: string[];
        granular_scopes?: Array<{ scope: string; target_ids?: string[] }>;
        application?: string;
        user_id?: string;
      };
    };
    // granular_scopes carries target_ids per scope — for whatsapp_business_management this
    // is the WABA id. We don't fetch phone_number_id here; the connector UI prompts the
    // user to pick if multiple are available.
    const wabaScope = json.data?.granular_scopes?.find((g) => g.scope === "whatsapp_business_management");
    const wabaId = wabaScope?.target_ids?.[0] ?? null;
    return { phoneNumberId: null, wabaId, displayName: null };
  } catch {
    return { phoneNumberId: null, wabaId: null, displayName: null };
  }
}
