import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { calculatePercentage, getDaysRemaining, getBillingCycleEnd } from "@/lib/utils";

/**
 * GET /api/usage/current
 * Get current usage stats for the authenticated user
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

    // Get account
    const { data: account, error } = await createSupabaseAdmin()
      .from("accounts")
      .select("*")
      .eq("clerk_user_id", userId)
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { success: false, error: "Account not found" },
        { status: 404 }
      );
    }

    const billingCycleStart = new Date(account.billing_cycle_start);
    const billingCycleEnd = getBillingCycleEnd(billingCycleStart);

    const usageStats = {
      tokensUsed: account.tokens_used,
      tokenLimit: account.token_limit,
      percentUsed: calculatePercentage(account.tokens_used, account.token_limit),
      daysRemaining: getDaysRemaining(billingCycleStart),
      billingCycleStart: billingCycleStart.toISOString(),
      billingCycleEnd: billingCycleEnd.toISOString(),
      tier: account.tier,
    };

    return NextResponse.json({
      success: true,
      data: usageStats,
    });
  } catch (error) {
    console.error("Usage fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
