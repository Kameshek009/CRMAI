import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * GET /api/usage/history
 * Get usage history for the authenticated user
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

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0"), 0);
    const days = Math.min(parseInt(searchParams.get("days") || "30"), 365);

    // Get account
    const { data: account, error: accountError } = await createSupabaseAdmin()
      .from("accounts")
      .select("id")
      .eq("clerk_user_id", userId)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { success: false, error: "Account not found" },
        { status: 404 }
      );
    }

    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get usage records
    const { data: records, error, count } = await createSupabaseAdmin()
      .from("usage_records")
      .select("*", { count: "exact" })
      .eq("account_id", account.id)
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error("UsageHistory", "Failed to fetch usage history", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch history" },
        { status: 500 }
      );
    }

    // Aggregate by day
    const dailyUsage: Record<string, number> = {};
    const actionBreakdown: Record<string, number> = {};

    records?.forEach((record) => {
      const date = new Date(record.created_at).toISOString().split("T")[0];
      dailyUsage[date] = (dailyUsage[date] || 0) + record.tokens_consumed;
      actionBreakdown[record.action_type] =
        (actionBreakdown[record.action_type] || 0) + record.tokens_consumed;
    });

    return NextResponse.json({
      success: true,
      data: {
        records,
        dailyUsage,
        actionBreakdown,
        pagination: {
          total: count,
          limit,
          offset,
        },
      },
    });
  } catch (error) {
    logger.error("UsageHistory", "Usage history error", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
