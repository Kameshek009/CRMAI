/**
 * Admin Users API
 *
 * GET  /api/admin/users — List all accounts with Clerk user info
 * PATCH /api/admin/users — Update account (tier, token_limit, reset, credits)
 *
 * Protected: only accessible to ADMIN_CLERK_USER_ID
 */

import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/constants/admin";
import { TIER_TOKEN_LIMITS, TIER_MAX_MEMBERS } from "@/lib/constants/tiers";
import type { SubscriptionTier } from "@/types";
import { logger } from "@/lib/logger";

const VALID_TIERS: SubscriptionTier[] = ["free", "pro", "max", "enterprise"];

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId || !isAdmin(userId)) {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 }
      );
    }

    const supabase = createSupabaseAdmin();
    const { data: accounts, error: dbError } = await supabase
      .from("accounts")
      .select("*")
      .order("created_at", { ascending: false });

    if (dbError) {
      return NextResponse.json(
        { success: false, error: dbError.message },
        { status: 500 }
      );
    }

    // Enrich with Clerk user data
    const clerkUserIds = accounts.map((a: { clerk_user_id: string }) => a.clerk_user_id);
    const client = await clerkClient();

    let clerkUsers: Map<string, { email: string | null; firstName: string | null; lastName: string | null; imageUrl: string | null }> = new Map();

    try {
      // Fetch in batches of 100
      for (let i = 0; i < clerkUserIds.length; i += 100) {
        const batch = clerkUserIds.slice(i, i + 100);
        const result = await client.users.getUserList({ userId: batch, limit: 100 });
        for (const user of result.data) {
          clerkUsers.set(user.id, {
            email: user.emailAddresses[0]?.emailAddress || null,
            firstName: user.firstName,
            lastName: user.lastName,
            imageUrl: user.imageUrl,
          });
        }
      }
    } catch {
      // If Clerk fails, continue without enrichment
    }

    const enrichedAccounts = accounts.map((account: Record<string, unknown>) => {
      const clerkData = clerkUsers.get(account.clerk_user_id as string);
      return {
        id: account.id,
        clerkUserId: account.clerk_user_id,
        email: clerkData?.email || null,
        firstName: clerkData?.firstName || null,
        lastName: clerkData?.lastName || null,
        imageUrl: clerkData?.imageUrl || null,
        tier: account.tier,
        tokenLimit: account.token_limit || 0,
        tokensUsed: account.tokens_used || 0,
        weeklyTokensUsed: account.weekly_tokens_used || 0,
        tokenCredits: account.token_credits || 0,
        stripeCustomerId: account.stripe_customer_id || null,
        stripeSubscriptionId: account.stripe_subscription_id || null,
        createdAt: account.created_at,
      };
    });

    return NextResponse.json({ success: true, data: enrichedAccounts });
  } catch (error) {
    logger.error("AdminUsers", "GET error", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId || !isAdmin(userId)) {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { accountId, action, value } = body as {
      accountId: string;
      action: string;
      value: string | number;
    };

    if (!accountId || !action) {
      return NextResponse.json(
        { success: false, error: "accountId and action are required" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();

    switch (action) {
      case "change_tier": {
        const tier = value as SubscriptionTier;
        if (!VALID_TIERS.includes(tier)) {
          return NextResponse.json(
            { success: false, error: `Invalid tier: ${tier}` },
            { status: 400 }
          );
        }

        const tokenLimit = TIER_TOKEN_LIMITS[tier] || TIER_TOKEN_LIMITS.free;
        const maxMembers = TIER_MAX_MEMBERS[tier] || TIER_MAX_MEMBERS.free;

        // Update account
        const { error: updateError } = await supabase
          .from("accounts")
          .update({
            tier,
            token_limit: tokenLimit,
            tokens_used: 0,
            weekly_tokens_used: 0,
            updated_at: new Date().toISOString(),
          })
          .eq("id", accountId);

        if (updateError) {
          return NextResponse.json(
            { success: false, error: updateError.message },
            { status: 500 }
          );
        }

        // Update teams owned by this account (tier, token_limit, usage reset, max_members)
        await supabase
          .from("teams")
          .update({
            tier,
            token_limit: tokenLimit,
            tokens_used: 0,
            weekly_tokens_used: 0,
            max_members: maxMembers,
          })
          .eq("owner_account_id", accountId);

        // Log activity
        await supabase.from("activity_logs").insert({
          account_id: accountId,
          event_type: "tier_upgraded",
          message: `Admin changed plan to ${tier}`,
          metadata: { tier, admin_action: true },
        });

        break;
      }

      case "set_token_limit": {
        const limit = Number(value);
        if (!Number.isFinite(limit) || limit < 0) {
          return NextResponse.json(
            { success: false, error: "Invalid token limit" },
            { status: 400 }
          );
        }

        const { error: updateError } = await supabase
          .from("accounts")
          .update({
            token_limit: limit,
            updated_at: new Date().toISOString(),
          })
          .eq("id", accountId);

        if (updateError) {
          return NextResponse.json(
            { success: false, error: updateError.message },
            { status: 500 }
          );
        }

        // Sync to teams
        await supabase
          .from("teams")
          .update({ token_limit: limit })
          .eq("owner_account_id", accountId);

        break;
      }

      case "reset_usage": {
        const { error: updateError } = await supabase
          .from("accounts")
          .update({
            tokens_used: 0,
            weekly_tokens_used: 0,
            week_start_date: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", accountId);

        if (updateError) {
          return NextResponse.json(
            { success: false, error: updateError.message },
            { status: 500 }
          );
        }

        // Sync to teams
        await supabase
          .from("teams")
          .update({
            tokens_used: 0,
            weekly_tokens_used: 0,
          })
          .eq("owner_account_id", accountId);

        break;
      }

      case "add_credits": {
        const credits = Number(value);
        if (!Number.isFinite(credits) || credits <= 0) {
          return NextResponse.json(
            { success: false, error: "Invalid credits amount" },
            { status: 400 }
          );
        }

        // Get current credits
        const { data: account } = await supabase
          .from("accounts")
          .select("token_credits")
          .eq("id", accountId)
          .single();

        const currentCredits = account?.token_credits || 0;

        const { error: updateError } = await supabase
          .from("accounts")
          .update({
            token_credits: currentCredits + credits,
            updated_at: new Date().toISOString(),
          })
          .eq("id", accountId);

        if (updateError) {
          return NextResponse.json(
            { success: false, error: updateError.message },
            { status: 500 }
          );
        }

        break;
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    // Return updated account
    const { data: updated } = await supabase
      .from("accounts")
      .select("*")
      .eq("id", accountId)
      .single();

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    logger.error("AdminUsers", "PATCH error", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
