import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getWorkspaceContext } from "@/lib/crm/team-helpers";
import {
  exchangeHubSpotCode,
  fetchHubSpotAccountInfo,
  isHubSpotConfigured,
} from "@/lib/importers/hubspot/oauth";
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
  url.searchParams.set("hubspot_oauth", status);
  if (message) url.searchParams.set("hubspot_oauth_message", message);
  const res = NextResponse.redirect(url);
  res.cookies.delete({ name: STATE_COOKIE_NAME, path: "/api/oauth" });
  res.cookies.delete({ name: `${STATE_COOKIE_NAME}_aid`, path: "/api/oauth" });
  return res;
}

export async function GET(request: NextRequest) {
  if (!isHubSpotConfigured()) {
    return redirectWithStatus("/dashboard/contacts", "error", "not_configured");
  }
  const cookieStore = await cookies();
  const stateCookie = cookieStore.get(STATE_COOKIE_NAME)?.value;
  const aidCookie = cookieStore.get(`${STATE_COOKIE_NAME}_aid`)?.value;
  const decoded = stateCookie ? decodeStateCookie(stateCookie) : null;
  const fallback = decoded?.returnTo || "/dashboard/contacts";

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
    const tokens = await exchangeHubSpotCode(code);
    const info = await fetchHubSpotAccountInfo(tokens.accessToken);

    await upsertOAuthTokens({
      teamId: context.workspaceId,
      accountId: context.accountId,
      provider: "hubspot",
      providerUserId: String(tokens.hubId ?? info?.hubId ?? "hubspot"),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: expiresInToTimestamp(tokens.expiresIn),
      scopes: [],
      metadata: {
        hub_id: tokens.hubId ?? info?.hubId,
        hub_domain: info?.hubDomain ?? null,
        connected_at: new Date().toISOString(),
      },
    });
    logger.info("HubSpotImport", "Connected", { team_id: context.workspaceId, hub_id: tokens.hubId });
    return redirectWithStatus(fallback, "connected");
  } catch (e) {
    logger.error("HubSpotImport", "OAuth callback failed", e);
    return redirectWithStatus(fallback, "error", "exchange_failed");
  }
}
