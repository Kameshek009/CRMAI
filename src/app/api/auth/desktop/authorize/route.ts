import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { generateDesktopTokens } from "@/lib/desktop-auth";

/**
 * POST /api/auth/desktop/authorize
 *
 * Generate access + refresh tokens for the desktop app.
 * This enables the "Auth Once" pattern - users stay logged in for 90 days.
 *
 * Token Architecture:
 * ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
 * │  Access Token   │     │  Refresh Token  │     │  Session (DB)   │
 * │  JWT, 1 hour    │     │  drt_xxx        │     │  Revocable      │
 * │  For API calls  │     │  90 days        │     │  Device mgmt    │
 * └─────────────────┘     └─────────────────┘     └─────────────────┘
 *
 * Flow:
 * 1. Desktop opens browser → user authenticates with Clerk
 * 2. User clicks "Authorize" → this endpoint is called
 * 3. We generate access_token (1h) + refresh_token (90d)
 * 4. Tokens sent to desktop via deep link
 * 5. Desktop stores both tokens in OS keychain
 * 6. When access_token expires, desktop calls /refresh with refresh_token
 * 7. User stays logged in for 90 days without seeing login screen
 */
export async function POST(request: NextRequest) {
  try {
    // Step 1: Verify Clerk authentication
    const { userId } = await auth();

    if (!userId) {
      console.log("[desktop/authorize] No userId - not authenticated");
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    console.log("[desktop/authorize] Authenticated user:", userId);

    // Step 2: Validate request body
    const body = await request.json();
    const { state, device_name, device_id } = body;

    if (!state) {
      console.log("[desktop/authorize] Missing state parameter");
      return NextResponse.json(
        { success: false, error: "State parameter is required" },
        { status: 400 }
      );
    }

    console.log("[desktop/authorize] Device:", device_name, "ID:", device_id);

    // Step 3: Get user info from Clerk (needed for account creation/update)
    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress || null;
    const name = user?.firstName
      ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
      : user?.username || null;

    // Step 4: Get or create account in Supabase
    const supabase = createSupabaseAdmin();

    console.log("[desktop/authorize] Looking for account with clerk_user_id:", userId);

    const { data: existingAccount, error: selectError } = await supabase
      .from("accounts")
      .select("*")
      .eq("clerk_user_id", userId)
      .single();

    if (selectError && selectError.code !== "PGRST116") {
      console.error("[desktop/authorize] Database select error:", selectError);
      return NextResponse.json(
        { success: false, error: "Database error" },
        { status: 500 }
      );
    }

    let account = existingAccount;

    if (!account) {
      console.log("[desktop/authorize] Creating new account for user:", userId);

      const { data: newAccount, error: insertError } = await supabase
        .from("accounts")
        .insert({
          clerk_user_id: userId,
          email,
          name,
          tier: "free",
          token_limit: 10000,
          tokens_used: 0,
          billing_cycle_start: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        // Handle race condition
        if (insertError.code === "23505") {
          const { data: retryAccount } = await supabase
            .from("accounts")
            .select("*")
            .eq("clerk_user_id", userId)
            .single();
          account = retryAccount;
        } else {
          console.error("[desktop/authorize] Failed to create account:", insertError);
          return NextResponse.json(
            { success: false, error: "Failed to create account" },
            { status: 500 }
          );
        }
      } else {
        account = newAccount;
      }
    } else {
      // Update existing account with latest email/name from Clerk
      await supabase
        .from("accounts")
        .update({ email, name })
        .eq("id", account.id);
    }

    if (!account) {
      return NextResponse.json(
        { success: false, error: "Failed to get or create account" },
        { status: 500 }
      );
    }

    console.log("[desktop/authorize] Using account:", account.id);

    // Step 4: Generate access + refresh tokens
    const tokens = await generateDesktopTokens(
      userId,
      account.id,
      {
        tier: account.tier,
        token_limit: account.token_limit,
        tokens_used: account.tokens_used,
      },
      device_name,
      device_id,
      request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined,
      request.headers.get("user-agent") || undefined
    );

    console.log("[desktop/authorize] Generated tokens, session:", tokens.sessionId);
    console.log("[desktop/authorize] Authorization successful for user:", userId);
    console.log("[desktop/authorize] User email:", email);

    return NextResponse.json({
      success: true,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_at: tokens.expiresAt,
      expires_in: 3600, // seconds until access token expires
      user: {
        id: userId,
        email,
        name,
        picture: user?.imageUrl || null,
        firstName: user?.firstName || null,
        lastName: user?.lastName || null,
        username: user?.username || null,
      },
      account: {
        id: account.id,
        tier: account.tier,
        token_limit: account.token_limit,
        tokens_used: account.tokens_used,
        billing_cycle_start: account.billing_cycle_start,
      },
    });
  } catch (error) {
    console.error("[desktop/authorize] Unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate authorization",
        details:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.message
            : undefined,
      },
      { status: 500 }
    );
  }
}
