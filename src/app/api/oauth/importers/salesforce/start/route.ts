import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContext } from "@/lib/crm/team-helpers";
import {
  buildSalesforceAuthorizeUrl,
  isSalesforceConfigured,
} from "@/lib/importers/salesforce/oauth";
import {
  STATE_COOKIE_NAME,
  STATE_COOKIE_MAX_AGE,
  encodeStateCookie,
  generateStateValue,
  sanitizeReturnTo,
} from "@/lib/oauth/state";

/**
 * GET /api/oauth/importers/salesforce/start?environment=production|sandbox
 *
 * Salesforce has separate authorize hosts for production vs sandbox.
 * The UI defaults to production; users with a sandbox org can pass
 * environment=sandbox.
 */
export async function GET(request: NextRequest) {
  if (!isSalesforceConfigured()) {
    return NextResponse.json(
      { success: false, error: "Salesforce OAuth is not configured on this server" },
      { status: 503 },
    );
  }
  const { context, error: ctxError } = await getWorkspaceContext();
  if (ctxError) return ctxError;

  const url = new URL(request.url);
  const env = url.searchParams.get("environment") === "sandbox" ? "sandbox" : "production";
  const returnTo = sanitizeReturnTo(url.searchParams.get("return_to"), "/dashboard/contacts");
  const state = generateStateValue();

  const response = NextResponse.redirect(
    buildSalesforceAuthorizeUrl({ state, environment: env }),
  );
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
  // Remember environment for the callback
  response.cookies.set({
    name: `${STATE_COOKIE_NAME}_sfenv`,
    value: env,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/oauth",
    maxAge: STATE_COOKIE_MAX_AGE,
  });
  return response;
}
