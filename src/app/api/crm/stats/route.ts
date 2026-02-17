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
      openDealsResult,
      tasksDueTodayResult,
      overdueTasksResult,
      wonDealsResult,
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
      supabase
        .from("deals")
        .select("id, value, ai_win_probability")
        .eq("team_id", context.teamId)
        .eq("status", "open")
        .eq("is_deleted", false)
        .limit(1000),
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
      supabase
        .from("deals")
        .select("id, value")
        .eq("team_id", context.teamId)
        .eq("status", "won")
        .gte("actual_close_date", monthStart.toISOString().split("T")[0])
        .limit(1000),
    ]);

    const openDeals = openDealsResult.data;
    const wonDeals = wonDealsResult.data;

    const openDealCount = openDeals?.length || 0;
    const pipelineValue = openDeals?.reduce((sum, d) => sum + Number(d.value), 0) || 0;
    const weightedForecast = openDeals?.reduce(
      (sum, d) => sum + Number(d.value) * (d.ai_win_probability / 100), 0
    ) || 0;

    const wonDealsThisMonth = wonDeals?.length || 0;
    const wonValueThisMonth = wonDeals?.reduce((sum, d) => sum + Number(d.value), 0) || 0;

    return NextResponse.json({
      success: true,
      data: {
        totalContacts: totalContactsResult.count || 0,
        newContactsThisWeek: newContactsResult.count || 0,
        totalDeals: totalDealsResult.count || 0,
        openDeals: openDealCount,
        pipelineValue,
        weightedForecast: Math.round(weightedForecast),
        tasksDueToday: tasksDueTodayResult.count || 0,
        overdueTasksCount: overdueTasksResult.count || 0,
        wonDealsThisMonth,
        wonValueThisMonth,
      },
    });
  } catch (error) {
    logger.error("Stats", "Failed to fetch stats", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
