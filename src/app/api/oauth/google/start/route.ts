import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContext } from "@/lib/crm/team-helpers";
import { buildGoogleAuthorizeUrl } from "@/lib/oauth/google";
import { isGoogleOAuthConfigured } from "@/lib/oauth/config";
import {
  STATE_COOKIE_NAME,
  STATE_COOKIE_MAX_AGE,
  encodeStateCookie,
  generateStateValue,
  sanitizeReturnTo,
} from "@/lib/oauth/state";
import { logger } from "@/lib/logger";

/**
 * GET /api/oauth/google/start?return_to=/dashboard/account?tab=integrations
 *
 * Begins the OAuth dance. Requires a signed-in user; we drop a state cookie
 * for CSRF and 302 to Google's consent screen. Google redirects back to
 * /api/oauth/google/callback which finishes the exchange.
 */
export async function GET(request: NextRequest) {
  if (!isGoogleOAuthConfigured()) {
    return NextResponse.json(
      { success: false, error: "Google OAuth is not configured on this server" },
      { status: 503 },
    );
  }

  const { context, error: ctxError } = await getWorkspaceContext();
  if (ctxError) return ctxError;

  const url = new URL(request.url);
  const returnTo = sanitizeReturnTo(
    url.searchParams.get("return_to"),
    "/dashboard/account?tab=integrations",
  );

  const state = generateStateValue();
  let authorizeUrl: string;
  try {
    authorizeUrl = buildGoogleAuthorizeUrl({ state });
  } catch (e) {
    logger.error("OAuthGoogle", "buildAuthorizeUrl failed", e);
    return NextResponse.json(
      { success: false, error: "OAuth configuration error" },
      { status: 500 },
    );
  }

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set({
    name: STATE_COOKIE_NAME,
    value: encodeStateCookie(state, returnTo),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/oauth",
    maxAge: STATE_COOKIE_MAX_AGE,
  });
  // Tying the cookie to the account_id lets the callback handler refuse a
  // cookie that was issued for a different user (e.g. after a sign-out/in).
  response.cookies.set({
    name: `${STATE_COOKIE_NAME}_aid`,
    value: context.accountId,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/oauth",
    maxAge: STATE_COOKIE_MAX_AGE,
  });
  return response;
}
