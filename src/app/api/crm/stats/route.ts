import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "analytics", "read", context.isDirector);
    if (permError) return permError;

    const supabase = createSupabaseAdmin();
    const now = new Date();

    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Run all queries in parallel for performance
    const [
      totalContactsResult,
      newContactsResult,
      totalDealsResult,
      dealStatsResult,
      tasksDueTodayResult,
      overdueTasksResult,
      wonStatsResult,
    ] = await Promise.all([
      supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("team_id", context.teamId)
        .eq("is_deleted", false),
      supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("team_id", context.teamId)
        .eq("is_deleted", false)
        .gte("created_at", weekStart.toISOString()),
      supabase
        .from("deals")
        .select("id", { count: "exact", head: true })
        .eq("team_id", context.teamId)
        .eq("is_deleted", false),
      // Use RPC for aggregated deal stats instead of loading 1000 rows
      supabase.rpc("get_deal_stats", { p_team_id: context.teamId }),
      supabase
        .from("crm_tasks")
        .select("id", { count: "exact", head: true })
        .eq("team_id", context.teamId)
        .in("status", ["todo", "in_progress"])
        .gte("due_date", todayStart.toISOString())
        .lte("due_date", todayEnd.toISOString()),
      supabase
        .from("crm_tasks")
        .select("id", { count: "exact", head: true })
        .eq("team_id", context.teamId)
        .in("status", ["todo", "in_progress"])
        .lt("due_date", todayStart.toISOString()),
      // Use RPC for aggregated won deal stats
      supabase.rpc("get_won_deals_stats", {
        p_team_id: context.teamId,
        p_since: monthStart.toISOString().split("T")[0],
      }),
    ]);

    const dealStats = dealStatsResult.data?.[0];
    const wonStats = wonStatsResult.data?.[0];

    return NextResponse.json({
      success: true,
      data: {
        totalContacts: totalContactsResult.count || 0,
        newContactsThisWeek: newContactsResult.count || 0,
        totalDeals: totalDealsResult.count || 0,
        openDeals: Number(dealStats?.open_count || 0),
        pipelineValue: Number(dealStats?.pipeline_value || 0),
        weightedForecast: Math.round(Number(dealStats?.weighted_forecast || 0)),
        tasksDueToday: tasksDueTodayResult.count || 0,
        overdueTasksCount: overdueTasksResult.count || 0,
        wonDealsThisMonth: Number(wonStats?.won_count || 0),
        wonValueThisMonth: Number(wonStats?.won_value || 0),
      },
    }, {
      headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    logger.error("Stats", "Failed to fetch stats", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
