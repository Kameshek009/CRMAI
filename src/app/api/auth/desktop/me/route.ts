import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { validateAccessToken } from "@/lib/desktop-auth";
import { createSupabaseAdmin } from "@/lib/supabase/server";

/**
 * GET /api/auth/desktop/me
 *
 * Get current user and account information.
 * Requires Bearer token authentication.
 *
 * Headers:
 *   Authorization: Bearer {accessToken}
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     user: {...},     // User info
 *     account: {...}   // Account info with latest usage
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Extract Bearer token
    const authHeader = request.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Authorization header required" },
        { status: 401 }
      );
    }

    const accessToken = authHeader.substring(7);

    // Validate access token
    const tokenData = validateAccessToken(accessToken);

    if (!tokenData) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired access token" },
        { status: 401 }
      );
    }

    // Get fresh account data from database
    const supabase = createSupabaseAdmin();

    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("id, current_team_id, billing_cycle_start, stripe_customer_id, stripe_subscription_id")
      .eq("id", tokenData.account_id)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { success: false, error: "Account not found" },
        { status: 404 }
      );
    }

    // Get team billing data
    const { data: team } = await supabase
      .from("teams")
      .select("tier, token_limit, tokens_used")
      .eq("id", account.current_team_id)
      .single();

    // Get session info to check it's still valid
    const { data: session, error: sessionError } = await supabase
      .from("desktop_sessions")
      .select("*")
      .eq("id", tokenData.session_id)
      .eq("revoked", false)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: "Session revoked or expired" },
        { status: 401 }
      );
    }

    // Update last_used_at
    await supabase
      .from("desktop_sessions")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", session.id);

    // Fetch full user profile from Clerk
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(tokenData.sub);

    const userName = clerkUser.firstName
      ? `${clerkUser.firstName}${clerkUser.lastName ? ` ${clerkUser.lastName}` : ""}`
      : clerkUser.username || null;

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: tokenData.sub,
          email: clerkUser.emailAddresses[0]?.emailAddress || null,
          name: userName,
          picture: clerkUser.imageUrl || null,
          firstName: clerkUser.firstName || null,
          lastName: clerkUser.lastName || null,
          username: clerkUser.username || null,
        },
        account: {
          id: account.id,
          tier: team?.tier || "free",
          token_limit: team?.token_limit || 0,
          tokens_used: team?.tokens_used || 0,
          billing_cycle_start: account.billing_cycle_start,
          stripe_customer_id: account.stripe_customer_id,
          stripe_subscription_id: account.stripe_subscription_id,
        },
        session: {
          id: session.id,
          device_name: session.device_name,
          created_at: session.created_at,
          last_used_at: session.last_used_at,
        },
      },
    });
  } catch (error) {
    console.error("Get user info error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get user info" },
      { status: 500 }
    );
  }
}
