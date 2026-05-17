import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getWorkspaceContext } from "@/lib/crm/team-helpers";
import {
  STATE_COOKIE_NAME,
  decodeStateCookie,
  safeStateEqual,
} from "@/lib/oauth/state";
import {
  exchangeEmbeddedSignupCode,
  introspectConnection,
  isEmbeddedSignupConfigured,
} from "@/lib/whatsapp/embedded-signup";
import { upsertWhatsAppSettings } from "@/lib/whatsapp/store";
import { logger } from "@/lib/logger";

/**
 * GET /api/oauth/whatsapp/callback
 *
 * Finish Embedded Signup. We validate the state cookie, exchange the code
 * for an access token, introspect which WABA the user authorised, and
 * persist a draft row in `whatsapp_settings`. The user still needs to pick
 * a phone_number_id from the integrations UI (Meta returns it in a
 * separate API call we'll wire up after the basic flow lands).
 */
function redirectWithStatus(returnTo: string, status: "connected" | "error", message?: string) {
  const url = new URL(returnTo, process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
  url.searchParams.set("whatsapp_oauth", status);
  if (message) url.searchParams.set("whatsapp_oauth_message", message);
  const res = NextResponse.redirect(url);
  res.cookies.delete({ name: STATE_COOKIE_NAME, path: "/api/oauth" });
  res.cookies.delete({ name: `${STATE_COOKIE_NAME}_aid`, path: "/api/oauth" });
  return res;
}

export async function GET(request: NextRequest) {
  if (!isEmbeddedSignupConfigured()) {
    return redirectWithStatus("/dashboard/account?tab=integrations", "error", "not_configured");
  }

  const cookieStore = await cookies();
  const stateCookie = cookieStore.get(STATE_COOKIE_NAME)?.value;
  const aidCookie = cookieStore.get(`${STATE_COOKIE_NAME}_aid`)?.value;
  const decoded = stateCookie ? decodeStateCookie(stateCookie) : null;
  const fallbackReturn = decoded?.returnTo || "/dashboard/account?tab=integrations";

  const url = new URL(request.url);
  if (url.searchParams.get("error")) {
    return redirectWithStatus(fallbackReturn, "error", url.searchParams.get("error") ?? "denied");
  }
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  if (!code || !stateParam || !decoded) {
    return redirectWithStatus(fallbackReturn, "error", "missing_state_or_code");
  }
  if (!safeStateEqual(decoded.state, stateParam)) {
    return redirectWithStatus(fallbackReturn, "error", "state_mismatch");
  }

  const { context, error: ctxError } = await getWorkspaceContext();
  if (ctxError) return redirectWithStatus(fallbackReturn, "error", "session_expired");
  if (aidCookie && aidCookie !== context.accountId) {
    return redirectWithStatus(fallbackReturn, "error", "account_mismatch");
  }

  try {
    const tokens = await exchangeEmbeddedSignupCode(code);
    const introspected = await introspectConnection(tokens.accessToken);

    if (!introspected.wabaId) {
      logger.warn("WhatsAppEmbedded", "No WABA id discovered — user must enter manually", {
        team_id: context.workspaceId,
      });
    }

    await upsertWhatsAppSettings({
      teamId: context.workspaceId,
      // Phone number id is picked by user post-callback — UI will prompt.
      phoneNumberId: introspected.phoneNumberId ?? "",
      wabaId: introspected.wabaId ?? "",
      accessToken: tokens.accessToken,
      origin: "embedded_signup",
      displayName: introspected.displayName ?? null,
      metadata: { embedded_signup_at: new Date().toISOString() },
    });

    return redirectWithStatus(fallbackReturn, "connected");
  } catch (e) {
    logger.error("WhatsAppEmbedded", "Token exchange failed", e);
    return redirectWithStatus(fallbackReturn, "error", "exchange_failed");
  }
}
