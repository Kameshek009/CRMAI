import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContext } from "@/lib/crm/team-helpers";
import {
  buildBitrix24AuthorizeUrl,
  isBitrix24Configured,
  isValidBitrix24Domain,
} from "@/lib/importers/bitrix24/oauth";
import {
  STATE_COOKIE_NAME,
  STATE_COOKIE_MAX_AGE,
  encodeStateCookie,
  generateStateValue,
  sanitizeReturnTo,
} from "@/lib/oauth/state";

/**
 * GET /api/oauth/importers/bitrix24/start?portal=mycompany.bitrix24.ru
 *
 * Bitrix24 doesn't have a universal "pick your portal" page — each
 * customer authorises against their own `<portal>.bitrix24.ru/oauth/...`.
 * The UI prompts the workspace owner for the portal before redirecting
 * here.
 */
export async function GET(request: NextRequest) {
  if (!isBitrix24Configured()) {
    return NextResponse.json(
      { success: false, error: "Bitrix24 OAuth is not configured on this server" },
      { status: 503 },
    );
  }

  const { context, error: ctxError } = await getWorkspaceContext();
  if (ctxError) return ctxError;

  const url = new URL(request.url);
  const portal = url.searchParams.get("portal")?.trim() ?? null;
  if (!isValidBitrix24Domain(portal)) {
    return NextResponse.json(
      {
        success: false,
        error: "Provide a valid Bitrix24 portal domain (e.g. mycompany.bitrix24.ru)",
      },
      { status: 400 },
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const redirectUri = `${appUrl.replace(/\/$/, "")}/api/oauth/importers/bitrix24/callback`;

  const returnTo = sanitizeReturnTo(url.searchParams.get("return_to"), "/dashboard/contacts");
  const state = generateStateValue();

  const response = NextResponse.redirect(
    buildBitrix24AuthorizeUrl({ portalDomain: portal, state, redirectUri }),
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
  // Persist the portal so the callback can verify the round-trip.
  response.cookies.set({
    name: `${STATE_COOKIE_NAME}_b24`,
    value: portal,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/oauth",
    maxAge: STATE_COOKIE_MAX_AGE,
  });
  return response;
}
