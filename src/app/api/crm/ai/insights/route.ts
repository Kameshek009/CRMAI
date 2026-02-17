import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import type { AIInsight } from "@/types/crm";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "analytics", "read", context.isDirector);
    if (permError) return permError;

    const supabase = createSupabaseAdmin();
    const insights: AIInsight[] = [];

    // Check for overdue tasks
    const { count: overdueTasks } = await supabase
      .from("crm_tasks")
      .select("id", { count: "exact", head: true })
      .eq("team_id", context.teamId)
      .in("status", ["todo", "in_progress"])
      .lt("due_date", new Date().toISOString());

    if (overdueTasks && overdueTasks > 0) {
      insights.push({
        id: "overdue-tasks",
        type: "warning",
        title: `${overdueTasks} overdue task${overdueTasks > 1 ? "s" : ""}`,
        description: "You have tasks past their due date. Review and update them.",
        priority: "high",
      });
    }

    // Check for deals without recent activity (stale deals)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: staleDeals } = await supabase
      .from("deals")
      .select("id, title, updated_at")
      .eq("team_id", context.teamId)
      .eq("status", "open")
      .eq("is_deleted", false)
      .lt("updated_at", thirtyDaysAgo.toISOString())
      .limit(5);

    if (staleDeals && staleDeals.length > 0) {
      insights.push({
        id: "stale-deals",
        type: "warning",
        title: `${staleDeals.length} deal${staleDeals.length > 1 ? "s" : ""} need${staleDeals.length === 1 ? "s" : ""} attention`,
        description: `These deals haven't been updated in 30+ days: ${staleDeals.map((d) => d.title).join(", ")}`,
        priority: "medium",
      });
    }

    // Check for contacts without recent engagement
    const { count: coldContacts } = await supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("team_id", context.teamId)
      .eq("status", "active")
      .eq("is_deleted", false)
      .lt("engagement_score", 20);

    if (coldContacts && coldContacts > 5) {
      insights.push({
        id: "cold-contacts",
        type: "opportunity",
        title: `${coldContacts} contacts with low engagement`,
        description: "Consider reaching out to re-engage these contacts.",
        priority: "medium",
      });
    }

    // Check for high-value deals close to closing
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const { data: closingDeals } = await supabase
      .from("deals")
      .select("id, title, value, expected_close_date")
      .eq("team_id", context.teamId)
      .eq("status", "open")
      .eq("is_deleted", false)
      .lte("expected_close_date", nextWeek.toISOString().split("T")[0])
      .gte("expected_close_date", new Date().toISOString().split("T")[0])
      .gt("value", 0)
      .limit(5);

    if (closingDeals && closingDeals.length > 0) {
      const totalValue = closingDeals.reduce((sum, d) => sum + Number(d.value), 0);
      insights.push({
        id: "closing-deals",
        type: "opportunity",
        title: `${closingDeals.length} deal${closingDeals.length > 1 ? "s" : ""} closing this week`,
        description: `Worth $${totalValue.toLocaleString()} total. Focus on closing these deals.`,
        priority: "high",
      });
    }

    // Add a motivational insight if pipeline is healthy
    if (insights.length === 0) {
      insights.push({
        id: "healthy-pipeline",
        type: "info",
        title: "Your pipeline looks healthy",
        description: "Keep up the great work! All tasks are on track and deals are progressing.",
        priority: "low",
      });
    }

    return NextResponse.json({ success: true, data: insights });
  } catch (error) {
    logger.error("CrmAiInsights", "GET error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
