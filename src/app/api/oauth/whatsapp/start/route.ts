import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContext } from "@/lib/crm/team-helpers";
import {
  buildEmbeddedSignupUrl,
  isEmbeddedSignupConfigured,
} from "@/lib/whatsapp/embedded-signup";
import {
  STATE_COOKIE_NAME,
  STATE_COOKIE_MAX_AGE,
  encodeStateCookie,
  generateStateValue,
  sanitizeReturnTo,
} from "@/lib/oauth/state";

/**
 * GET /api/oauth/whatsapp/start
 *
 * Kick off WhatsApp Embedded Signup. Workspace owner is required. Returns
 * 503 when the deployment isn't configured for Embedded Signup so the UI
 * can keep the BYO path as the sole option.
 *
 * Reuses the same state-cookie helpers as the Google flow — see
 * src/lib/oauth/state.ts.
 */
export async function GET(request: NextRequest) {
  if (!isEmbeddedSignupConfigured()) {
    return NextResponse.json(
      { success: false, error: "WhatsApp Embedded Signup is not configured on this server" },
      { status: 503 },
    );
  }

  const { context, error: ctxError } = await getWorkspaceContext();
  if (ctxError) return ctxError;
  if (!context.isOwner) {
    return NextResponse.json(
      { success: false, error: "Only workspace owners can connect WhatsApp" },
      { status: 403 },
    );
  }

  const url = new URL(request.url);
  const returnTo = sanitizeReturnTo(
    url.searchParams.get("return_to"),
    "/dashboard/account?tab=integrations",
  );

  const state = generateStateValue();
  const authorizeUrl = buildEmbeddedSignupUrl({ state });

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
