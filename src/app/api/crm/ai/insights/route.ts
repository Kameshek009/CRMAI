import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/crm/with-api-handler";
import type { AIInsight } from "@/types/crm";

export const GET = withApiHandler(
  {
    permission: { resource: "analytics", action: "read" },
    logTag: "CrmAiInsights",
  },
  async (_request, ctx) => {
    const supabase = createSupabaseAdmin();
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);

    // Run all 4 queries in parallel (they are independent)
    const [overdueResult, staleResult, coldResult, closingResult] = await Promise.all([
      supabase
        .from("crm_tasks")
        .select("id", { count: "exact", head: true })
        .eq("team_id", ctx.workspaceId)
        .in("status", ["todo", "in_progress"])
        .lt("due_date", now.toISOString()),
      supabase
        .from("deals")
        .select("id, title, updated_at")
        .eq("team_id", ctx.workspaceId)
        .eq("status", "open")
        .eq("is_deleted", false)
        .lt("updated_at", thirtyDaysAgo.toISOString())
        .limit(5),
      supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("team_id", ctx.workspaceId)
        .eq("status", "active")
        .eq("is_deleted", false)
        .lt("engagement_score", 20),
      supabase
        .from("deals")
        .select("id, title, value, expected_close_date")
        .eq("team_id", ctx.workspaceId)
        .eq("status", "open")
        .eq("is_deleted", false)
        .lte("expected_close_date", nextWeek.toISOString().split("T")[0])
        .gte("expected_close_date", now.toISOString().split("T")[0])
        .gt("value", 0)
        .limit(5),
    ]);

    const insights: AIInsight[] = [];

    const overdueTasks = overdueResult.count;
    if (overdueTasks && overdueTasks > 0) {
      insights.push({
        id: "overdue-tasks",
        type: "warning",
        title: "crm.insights.overdueTasks.title",
        description: "crm.insights.overdueTasks.description",
        params: { count: overdueTasks },
        priority: "high",
      });
    }

    const staleDeals = staleResult.data;
    if (staleDeals && staleDeals.length > 0) {
      insights.push({
        id: "stale-deals",
        type: "warning",
        title: "crm.insights.staleDeals.title",
        description: "crm.insights.staleDeals.description",
        params: { count: staleDeals.length, deals: staleDeals.map((d) => d.title).join(", ") },
        priority: "medium",
      });
    }

    const coldContacts = coldResult.count;
    if (coldContacts && coldContacts > 5) {
      insights.push({
        id: "cold-contacts",
        type: "opportunity",
        title: "crm.insights.coldContacts.title",
        description: "crm.insights.coldContacts.description",
        params: { count: coldContacts },
        priority: "medium",
      });
    }

    const closingDeals = closingResult.data;
    if (closingDeals && closingDeals.length > 0) {
      const totalValue = closingDeals.reduce((sum, d) => sum + Number(d.value), 0);
      insights.push({
        id: "closing-deals",
        type: "opportunity",
        title: "crm.insights.closingDeals.title",
        description: "crm.insights.closingDeals.description",
        params: { count: closingDeals.length, value: totalValue.toLocaleString() },
        priority: "high",
      });
    }

    if (insights.length === 0) {
      insights.push({
        id: "healthy-pipeline",
        type: "info",
        title: "crm.insights.healthy.title",
        description: "crm.insights.healthy.description",
        priority: "low",
      });
    }

    return NextResponse.json({ success: true, data: insights });
  }
);
