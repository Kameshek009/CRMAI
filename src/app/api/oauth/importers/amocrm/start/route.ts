import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContext } from "@/lib/crm/team-helpers";
import {
  buildAmoCRMAuthorizeUrl,
  isAmoCRMConfigured,
} from "@/lib/importers/amocrm/oauth";
import {
  STATE_COOKIE_NAME,
  STATE_COOKIE_MAX_AGE,
  encodeStateCookie,
  generateStateValue,
  sanitizeReturnTo,
} from "@/lib/oauth/state";

export async function GET(request: NextRequest) {
  if (!isAmoCRMConfigured()) {
    return NextResponse.json(
      { success: false, error: "AmoCRM OAuth is not configured on this server" },
      { status: 503 },
    );
  }
  const { context, error: ctxError } = await getWorkspaceContext();
  if (ctxError) return ctxError;

  const url = new URL(request.url);
  const returnTo = sanitizeReturnTo(url.searchParams.get("return_to"), "/dashboard/contacts");
  const state = generateStateValue();

  const response = NextResponse.redirect(buildAmoCRMAuthorizeUrl(state));
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
