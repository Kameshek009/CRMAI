import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getWorkspaceContext } from "@/lib/crm/team-helpers";
import {
  exchangeMicrosoftCode,
  fetchMicrosoftUserInfo,
} from "@/lib/oauth/microsoft";
import { upsertOAuthTokens } from "@/lib/oauth/tokens";
import { expiresInToTimestamp } from "@/lib/oauth/google";
import {
  STATE_COOKIE_NAME,
  decodeStateCookie,
  safeStateEqual,
} from "@/lib/oauth/state";
import { logger } from "@/lib/logger";

function redirectWithStatus(returnTo: string, status: "connected" | "error", message?: string) {
  const url = new URL(returnTo, process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
  url.searchParams.set("microsoft_oauth", status);
  if (message) url.searchParams.set("microsoft_oauth_message", message);
  const res = NextResponse.redirect(url);
  res.cookies.delete({ name: STATE_COOKIE_NAME, path: "/api/oauth" });
  res.cookies.delete({ name: `${STATE_COOKIE_NAME}_aid`, path: "/api/oauth" });
  return res;
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const stateCookie = cookieStore.get(STATE_COOKIE_NAME)?.value;
  const aidCookie = cookieStore.get(`${STATE_COOKIE_NAME}_aid`)?.value;
  const decoded = stateCookie ? decodeStateCookie(stateCookie) : null;
  const fallback = decoded?.returnTo || "/dashboard/account?tab=integrations";

  const url = new URL(request.url);
  if (url.searchParams.get("error")) {
    return redirectWithStatus(fallback, "error", url.searchParams.get("error") ?? "denied");
  }
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  if (!code || !stateParam || !decoded) {
    return redirectWithStatus(fallback, "error", "missing_state_or_code");
  }
  if (!safeStateEqual(decoded.state, stateParam)) {
    return redirectWithStatus(fallback, "error", "state_mismatch");
  }

  const { context, error: ctxError } = await getWorkspaceContext();
  if (ctxError) return redirectWithStatus(fallback, "error", "session_expired");
  if (aidCookie && aidCookie !== context.accountId) {
    return redirectWithStatus(fallback, "error", "account_mismatch");
  }

  try {
    const tokens = await exchangeMicrosoftCode(code);
    const userInfo = await fetchMicrosoftUserInfo(tokens.accessToken);
    await upsertOAuthTokens({
      teamId: context.workspaceId,
      accountId: context.accountId,
      provider: "microsoft",
      providerUserId: userInfo.id,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: expiresInToTimestamp(tokens.expiresIn),
      scopes: tokens.scope.split(" ").filter(Boolean),
      metadata: {
        email: userInfo.email,
        name: userInfo.displayName,
        connected_at: new Date().toISOString(),
      },
    });

    // Best-effort: start an inbox subscription. Failure (e.g. tenant
    // doesn't allow webhooks reaching the public web) shouldn't block
    // the user from finishing the flow.
    try {
      const { ensureOutlookInboxSubscription } = await import("@/lib/inbox/microsoft");
      await ensureOutlookInboxSubscription({ teamId: context.workspaceId });
    } catch (e) {
      logger.warn("OAuthMicrosoft", "inbox subscription failed (non-fatal)", e);
    }

    logger.info("OAuthMicrosoft", "Connection saved", {
      team_id: context.workspaceId,
      account_id: context.accountId,
      provider_user_id: userInfo.id,
    });
    return redirectWithStatus(fallback, "connected");
  } catch (e) {
    logger.error("OAuthMicrosoft", "Token exchange / persistence failed", e);
    return redirectWithStatus(fallback, "error", "exchange_failed");
  }
}
