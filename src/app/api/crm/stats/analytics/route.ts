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
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // --- Conversion rates by stage ---
    const { data: allDeals } = await supabase
      .from("deals")
      .select("id, value, status, stage_id, ai_win_probability, created_at, actual_close_date, expected_close_date, deal_stages(name, color, position, is_won, is_lost)")
      .eq("team_id", context.teamId)
      .eq("is_deleted", false);

    const deals = allDeals || [];

    // Stage conversion funnel
    const { data: stages } = await supabase
      .from("deal_stages")
      .select("id, name, color, position, is_won, is_lost")
      .eq("team_id", context.teamId)
      .order("position", { ascending: true });

    const stageConversion = (stages || []).map((stage) => {
      const dealsInStage = deals.filter((d) => d.stage_id === stage.id);
      const totalInStage = dealsInStage.length;
      const totalValue = dealsInStage.reduce((sum, d) => sum + Number(d.value), 0);
      return {
        name: stage.name,
        color: stage.color,
        position: stage.position,
        isWon: stage.is_won,
        isLost: stage.is_lost,
        count: totalInStage,
        value: totalValue,
      };
    });

    // --- Win/Loss analysis ---
    const wonDeals = deals.filter((d) => d.status === "won");
    const lostDeals = deals.filter((d) => d.status === "lost");
    const openDeals = deals.filter((d) => d.status === "open");

    const totalWonValue = wonDeals.reduce((sum, d) => sum + Number(d.value), 0);
    const totalLostValue = lostDeals.reduce((sum, d) => sum + Number(d.value), 0);
    const avgWonValue = wonDeals.length > 0 ? Math.round(totalWonValue / wonDeals.length) : 0;
    const avgLostValue = lostDeals.length > 0 ? Math.round(totalLostValue / lostDeals.length) : 0;
    const winRate = (wonDeals.length + lostDeals.length) > 0
      ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100)
      : 0;

    // --- Deal velocity (avg days to close) ---
    const closedDealsWithDates = wonDeals.filter((d) => d.actual_close_date && d.created_at);
    const avgDaysToClose = closedDealsWithDates.length > 0
      ? Math.round(
          closedDealsWithDates.reduce((sum, d) => {
            const created = new Date(d.created_at);
            const closed = new Date(d.actual_close_date!);
            return sum + (closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
          }, 0) / closedDealsWithDates.length
        )
      : 0;

    // --- Monthly revenue comparison (last 6 months) ---
    const monthlyRevenue: { month: string; revenue: number; deals: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const monthDeals = wonDeals.filter((d) => {
        if (!d.actual_close_date) return false;
        const closeDate = new Date(d.actual_close_date);
        return closeDate >= mStart && closeDate <= mEnd;
      });
      monthlyRevenue.push({
        month: mStart.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        revenue: monthDeals.reduce((sum, d) => sum + Number(d.value), 0),
        deals: monthDeals.length,
      });
    }

    // --- This month vs last month comparison ---
    const thisMonthWon = wonDeals.filter((d) => {
      if (!d.actual_close_date) return false;
      return new Date(d.actual_close_date) >= monthStart;
    });
    const lastMonthWon = wonDeals.filter((d) => {
      if (!d.actual_close_date) return false;
      const cd = new Date(d.actual_close_date);
      return cd >= prevMonthStart && cd <= prevMonthEnd;
    });
    const thisMonthRevenue = thisMonthWon.reduce((sum, d) => sum + Number(d.value), 0);
    const lastMonthRevenue = lastMonthWon.reduce((sum, d) => sum + Number(d.value), 0);
    const revenueGrowth = lastMonthRevenue > 0
      ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : thisMonthRevenue > 0 ? 100 : 0;

    // --- Contact status distribution ---
    const { data: contacts } = await supabase
      .from("contacts")
      .select("id, status, source, engagement_score, created_at")
      .eq("team_id", context.teamId)
      .eq("is_deleted", false);

    const contactsByStatus: Record<string, number> = {};
    const contactsBySource: Record<string, number> = {};
    let totalEngagement = 0;
    (contacts || []).forEach((c) => {
      contactsByStatus[c.status] = (contactsByStatus[c.status] || 0) + 1;
      if (c.source) {
        contactsBySource[c.source] = (contactsBySource[c.source] || 0) + 1;
      }
      totalEngagement += c.engagement_score || 0;
    });
    const avgEngagement = (contacts || []).length > 0
      ? Math.round(totalEngagement / (contacts || []).length)
      : 0;

    // --- Activity counts by type (last 30 days) ---
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentActivities } = await supabase
      .from("activities")
      .select("type, created_at")
      .eq("team_id", context.teamId)
      .gte("created_at", thirtyDaysAgo.toISOString());

    const activityByType: Record<string, number> = {};
    const activityByDay: Record<string, number> = {};
    (recentActivities || []).forEach((a) => {
      activityByType[a.type] = (activityByType[a.type] || 0) + 1;
      const day = a.created_at.split("T")[0];
      activityByDay[day] = (activityByDay[day] || 0) + 1;
    });

    // Build daily activity array for last 30 days
    const dailyActivity: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      dailyActivity.push({ date: dateStr, count: activityByDay[dateStr] || 0 });
    }

    // --- Task stats ---
    const { data: allTasks } = await supabase
      .from("crm_tasks")
      .select("id, status, priority, type, due_date, completed_at, created_at")
      .eq("team_id", context.teamId);

    const tasksByStatus: Record<string, number> = {};
    const tasksByPriority: Record<string, number> = {};
    const tasksByType: Record<string, number> = {};
    let completedThisWeek = 0;
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    (allTasks || []).forEach((t) => {
      tasksByStatus[t.status] = (tasksByStatus[t.status] || 0) + 1;
      tasksByPriority[t.priority] = (tasksByPriority[t.priority] || 0) + 1;
      tasksByType[t.type] = (tasksByType[t.type] || 0) + 1;
      if (t.completed_at && new Date(t.completed_at) >= weekStart) {
        completedThisWeek++;
      }
    });

    // --- Top 5 deals by value ---
    const topDeals = [...openDeals]
      .sort((a, b) => Number(b.value) - Number(a.value))
      .slice(0, 5)
      .map((d) => {
        const stageInfo = d.deal_stages as unknown as { name?: string; color?: string } | null;
        return {
          id: d.id,
          title: (d as unknown as { title?: string }).title || "Untitled",
          value: Number(d.value),
          probability: d.ai_win_probability,
          stage: stageInfo?.name || "Unknown",
          stageColor: stageInfo?.color || "#6366f1",
        };
      });

    // --- Company health distribution ---
    const { data: companies } = await supabase
      .from("companies")
      .select("id, ai_health_score, industry")
      .eq("team_id", context.teamId)
      .eq("is_deleted", false);

    const healthBuckets = { excellent: 0, good: 0, fair: 0, poor: 0 };
    const companiesByIndustry: Record<string, number> = {};
    (companies || []).forEach((c) => {
      const score = c.ai_health_score;
      if (score >= 80) healthBuckets.excellent++;
      else if (score >= 60) healthBuckets.good++;
      else if (score >= 40) healthBuckets.fair++;
      else healthBuckets.poor++;
      if (c.industry) {
        companiesByIndustry[c.industry] = (companiesByIndustry[c.industry] || 0) + 1;
      }
    });

    // --- Lead conversion funnel ---
    const { data: leads } = await supabase
      .from("leads")
      .select("id, status, created_at")
      .eq("team_id", context.teamId)
      .eq("is_deleted", false);

    const totalLeads = (leads || []).length;
    const convertedLeads = (leads || []).filter((l) => l.status === "converted").length;
    const totalContactsForFunnel = (contacts || []).length;
    const totalDeals = deals.length;
    const wonDealsCount = wonDeals.length;

    const leadConversionFunnel = [
      { stage: "Leads", count: totalLeads, color: "#f4a261" },
      { stage: "Contacts", count: totalContactsForFunnel, color: "#e76f51" },
      { stage: "Deals", count: totalDeals, color: "#2a9d8f" },
      { stage: "Won", count: wonDealsCount, color: "#22c55e" },
    ];

    // --- Pipeline velocity (value * win rate / avg cycle time) ---
    const pipelineValue = openDeals.reduce((sum, d) => sum + Number(d.value), 0);
    const salesVelocity = avgDaysToClose > 0
      ? Math.round((pipelineValue * (winRate / 100)) / avgDaysToClose)
      : 0;

    // --- Forecast (weighted pipeline) ---
    const weightedForecast = openDeals.reduce(
      (sum, d) => sum + Number(d.value) * (d.ai_win_probability / 100), 0
    );

    return NextResponse.json({
      success: true,
      data: {
        // Deal metrics
        stageConversion,
        winRate,
        avgWonValue,
        avgLostValue,
        avgDaysToClose,
        totalWonValue,
        totalLostValue,
        wonCount: wonDeals.length,
        lostCount: lostDeals.length,
        openCount: openDeals.length,
        pipelineValue,
        weightedForecast: Math.round(weightedForecast),
        salesVelocity,
        topDeals,

        // Revenue
        monthlyRevenue,
        thisMonthRevenue,
        lastMonthRevenue,
        revenueGrowth,

        // Contacts
        contactsByStatus: Object.entries(contactsByStatus).map(([status, count]) => ({ status, count })),
        contactsBySource: Object.entries(contactsBySource).map(([source, count]) => ({ source, count })),
        totalContacts: (contacts || []).length,
        avgEngagement,

        // Activities
        activityByType: Object.entries(activityByType).map(([type, count]) => ({ type, count })),
        dailyActivity,
        totalActivities: (recentActivities || []).length,

        // Tasks
        tasksByStatus: Object.entries(tasksByStatus).map(([status, count]) => ({ status, count })),
        tasksByPriority: Object.entries(tasksByPriority).map(([priority, count]) => ({ priority, count })),
        tasksByType: Object.entries(tasksByType).map(([type, count]) => ({ type, count })),
        completedThisWeek,
        totalTasks: (allTasks || []).length,

        // Lead funnel
        leadConversionFunnel,

        // Companies
        healthBuckets,
        companiesByIndustry: Object.entries(companiesByIndustry).map(([industry, count]) => ({ industry, count })),
        totalCompanies: (companies || []).length,
      },
    });
  } catch (error) {
    logger.error("CrmAnalytics", "GET error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
