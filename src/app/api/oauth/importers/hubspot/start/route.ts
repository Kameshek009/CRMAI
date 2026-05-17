import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContext } from "@/lib/crm/team-helpers";
import {
  buildHubSpotAuthorizeUrl,
  isHubSpotConfigured,
} from "@/lib/importers/hubspot/oauth";
import {
  STATE_COOKIE_NAME,
  STATE_COOKIE_MAX_AGE,
  encodeStateCookie,
  generateStateValue,
  sanitizeReturnTo,
} from "@/lib/oauth/state";

/**
 * GET /api/oauth/importers/hubspot/start
 * Drop a state cookie, redirect to HubSpot's authorize screen.
 */
export async function GET(request: NextRequest) {
  if (!isHubSpotConfigured()) {
    return NextResponse.json(
      { success: false, error: "HubSpot OAuth is not configured on this server" },
      { status: 503 },
    );
  }

  const { context, error: ctxError } = await getWorkspaceContext();
  if (ctxError) return ctxError;

  const url = new URL(request.url);
  const returnTo = sanitizeReturnTo(
    url.searchParams.get("return_to"),
    "/dashboard/contacts",
  );
  const state = generateStateValue();
  const authorizeUrl = buildHubSpotAuthorizeUrl(state);

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
