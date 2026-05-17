import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getWorkspaceContext } from "@/lib/crm/team-helpers";
import {
  exchangeCodeForTokens,
  expiresInToTimestamp,
  fetchGoogleUserInfo,
} from "@/lib/oauth/google";
import { upsertOAuthTokens } from "@/lib/oauth/tokens";
import {
  STATE_COOKIE_NAME,
  decodeStateCookie,
  safeStateEqual,
} from "@/lib/oauth/state";
import { logger } from "@/lib/logger";

/**
 * GET /api/oauth/google/callback?code=...&state=...
 *
 * Finishes the OAuth dance: validate state cookie → exchange code → store
 * encrypted tokens → redirect to the originating settings page with a status
 * flag the client can render a toast for.
 */
function redirectWithStatus(returnTo: string, status: "connected" | "error", message?: string) {
  const url = new URL(returnTo, process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
  url.searchParams.set("google_oauth", status);
  if (message) url.searchParams.set("google_oauth_message", message);
  const response = NextResponse.redirect(url);
  response.cookies.delete({ name: STATE_COOKIE_NAME, path: "/api/oauth" });
  response.cookies.delete({ name: `${STATE_COOKIE_NAME}_aid`, path: "/api/oauth" });
  return response;
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const stateCookie = cookieStore.get(STATE_COOKIE_NAME)?.value;
  const aidCookie = cookieStore.get(`${STATE_COOKIE_NAME}_aid`)?.value;

  const decoded = stateCookie ? decodeStateCookie(stateCookie) : null;
  const fallbackReturn = decoded?.returnTo || "/dashboard/account?tab=integrations";

  const url = new URL(request.url);
  const errorParam = url.searchParams.get("error");
  if (errorParam) {
    // User denied consent or Google returned an error.
    return redirectWithStatus(fallbackReturn, "error", errorParam);
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
  if (ctxError) {
    // Clerk session expired between start and callback.
    return redirectWithStatus(fallbackReturn, "error", "session_expired");
  }
  if (aidCookie && aidCookie !== context.accountId) {
    return redirectWithStatus(fallbackReturn, "error", "account_mismatch");
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const userInfo = await fetchGoogleUserInfo(tokens.accessToken);

    await upsertOAuthTokens({
      teamId: context.workspaceId,
      accountId: context.accountId,
      provider: "google",
      providerUserId: userInfo.sub,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: expiresInToTimestamp(tokens.expiresIn),
      scopes: tokens.scope.split(" ").filter(Boolean),
      metadata: {
        email: userInfo.email,
        email_verified: userInfo.emailVerified,
        name: userInfo.name,
        picture: userInfo.picture,
        connected_at: new Date().toISOString(),
      },
    });

    logger.info("OAuthGoogle", "Connection saved", {
      team_id: context.workspaceId,
      account_id: context.accountId,
      provider_user_id: userInfo.sub,
    });

    // Best-effort: start the Gmail watch + Calendar channel immediately.
    // Failure (e.g. Pub/Sub topic not configured yet) shouldn't block the
    // user from finishing the flow — the daily crons will pick it up once
    // env is set.
    try {
      const { ensureGmailWatchForConnection } = await import("@/lib/inbox/gmail");
      await ensureGmailWatchForConnection({ teamId: context.workspaceId });
    } catch (e) {
      logger.warn("OAuthGoogle", "Gmail watch start failed (non-fatal)", e);
    }
    try {
      const { ensureCalendarChannel } = await import("@/lib/calendar/google");
      await ensureCalendarChannel({ teamId: context.workspaceId });
    } catch (e) {
      logger.warn("OAuthGoogle", "Calendar channel start failed (non-fatal)", e);
    }
    return redirectWithStatus(fallbackReturn, "connected");
  } catch (e) {
    logger.error("OAuthGoogle", "Token exchange / persistence failed", e);
    return redirectWithStatus(fallbackReturn, "error", "exchange_failed");
  }
}
