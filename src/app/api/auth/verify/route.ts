import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { TIER_TOKEN_LIMITS } from "@/lib/constants/tiers";
import type { SubscriptionTier } from "@/types";
import { logger } from "@/lib/logger";

/**
 * POST /api/auth/verify
 * Verify JWT token from desktop app and return account info
 */
export async function POST(request: NextRequest) {
  try {
    // Get auth from Clerk (handles both session and Bearer token)
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get or create account in Supabase
    const { data: account, error } = await createSupabaseAdmin()
      .from("accounts")
      .select("*")
      .eq("clerk_user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned
      logger.error("Auth","Database error:", error);
      return NextResponse.json(
        { success: false, error: "Database error" },
        { status: 500 }
      );
    }

    // Check if account is deactivated
    if (account && account.is_active === false) {
      return NextResponse.json(
        { success: false, error: "Account deactivated", code: "ACCOUNT_DEACTIVATED" },
        { status: 403 }
      );
    }

    // If no account exists, create one
    if (!account) {
      const supabaseAdmin = createSupabaseAdmin();

      // Fetch Clerk user data for name & email
      let clerkName: string | null = null;
      let clerkEmail: string | null = null;
      try {
        const client = await clerkClient();
        const clerkUser = await client.users.getUser(userId);
        clerkName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null;
        clerkEmail = clerkUser.emailAddresses[0]?.emailAddress || null;
      } catch {
        // Continue without Clerk data
      }

      const { data: newAccount, error: createError } = await supabaseAdmin
        .from("accounts")
        .insert({
          clerk_user_id: userId,
          tier: "free",
          token_limit: 50000,
          tokens_used: 0,
          billing_cycle_start: new Date().toISOString(),
          name: clerkName,
          email: clerkEmail,
        })
        .select()
        .single();

      if (createError) {
        logger.error("Auth","Failed to create account:", createError);
        return NextResponse.json(
          { success: false, error: "Failed to create account" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          userId,
          account: newAccount,
        },
      });
    }

    // Sync name & email from Clerk if missing
    if (!account.name || !account.email) {
      try {
        const client = await clerkClient();
        const clerkUser = await client.users.getUser(userId);
        const clerkName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null;
        const clerkEmail = clerkUser.emailAddresses[0]?.emailAddress || null;

        const updates: Record<string, string | null> = {};
        if (!account.name && clerkName) updates.name = clerkName;
        if (!account.email && clerkEmail) updates.email = clerkEmail;

        if (Object.keys(updates).length > 0) {
          await createSupabaseAdmin()
            .from("accounts")
            .update(updates)
            .eq("id", account.id);
        }
      } catch (syncErr) {
        logger.error("Auth", "Failed to sync Clerk data:", syncErr);
      }
    }

    // Enrich with team billing data + auto-sync stale limits
    let enrichedAccount = account;
    if (account.current_team_id) {
      const supabaseAdmin = createSupabaseAdmin();
      const { data: team } = await supabaseAdmin
        .from("teams")
        .select("*")
        .eq("id", account.current_team_id)
        .single();
      if (team) {
        const tier = team.tier as SubscriptionTier;
        const expectedLimit = TIER_TOKEN_LIMITS[tier] ?? TIER_TOKEN_LIMITS.free;
        let tokenLimit = team.token_limit;
        let seatCount = team.seat_count;

        // Auto-fix token_limit if it doesn't match the tier
        const needsLimitSync = expectedLimit > 0 && team.token_limit !== expectedLimit;

        // Auto-fix seat_count atomically via DB function
        const { data: actualSeats } = await supabaseAdmin.rpc("sync_seat_count", { p_team_id: team.id });
        const needsSeatSync = actualSeats !== team.seat_count;
        if (actualSeats != null) seatCount = actualSeats;

        if (needsLimitSync) {
          await supabaseAdmin
            .from("teams")
            .update({ token_limit: expectedLimit })
            .eq("id", team.id);
          tokenLimit = expectedLimit;
          logger.info("Auth", `Auto-synced team ${team.id}: token_limit=${tokenLimit}`);
        }

        enrichedAccount = {
          ...account,
          tier: team.tier,
          token_limit: tokenLimit,
          tokens_used: team.tokens_used,
          weekly_tokens_used: team.weekly_tokens_used,
          week_start_date: team.week_start_date,
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        userId,
        account: enrichedAccount,
      },
    });
  } catch (error) {
    logger.error("Auth","Auth verification error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
