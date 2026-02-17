import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { calculatePercentage, getDaysRemaining, getBillingCycleEnd } from "@/lib/utils";
import { logger } from "@/lib/logger";

/**
 * GET /api/usage/current
 * Get current usage stats for the authenticated user (from team billing)
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = createSupabaseAdmin();

    // Get account
    const { data: account, error } = await supabase
      .from("accounts")
      .select("id, current_team_id, billing_cycle_start")
      .eq("clerk_user_id", userId)
      .single();

    if (error) {
      logger.error("UsageCurrent", "Database error", error);
      return NextResponse.json(
        { success: false, error: "Account not found" },
        { status: 404 }
      );
    }

    // Get team billing data
    const { data: team } = await supabase
      .from("teams")
      .select("tier, token_limit, tokens_used, weekly_tokens_used")
      .eq("id", account.current_team_id)
      .single();

    const tier = team?.tier || "free";
    const tokenLimit = team?.token_limit || 0;
    const tokensUsed = team?.tokens_used || 0;

    const billingCycleStart = new Date(account.billing_cycle_start);
    const billingCycleEnd = getBillingCycleEnd(billingCycleStart);

    const usageStats = {
      tokensUsed,
      tokenLimit,
      percentUsed: calculatePercentage(tokensUsed, tokenLimit),
      daysRemaining: getDaysRemaining(billingCycleStart),
      billingCycleStart: billingCycleStart.toISOString(),
      billingCycleEnd: billingCycleEnd.toISOString(),
      tier,
    };

    return NextResponse.json({
      success: true,
      data: usageStats,
    });
  } catch (error) {
    logger.error("UsageCurrent", "Usage fetch error", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
