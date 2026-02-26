import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/crm/with-api-handler";

export const GET = withApiHandler(
  {
    permission: { resource: "analytics", action: "read" },
    logTag: "CrmRevenueTrend",
  },
  async (_request, ctx) => {
    const supabase = createSupabaseAdmin();
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: wonDeals } = await supabase
      .from("deals")
      .select("value, actual_close_date")
      .eq("team_id", ctx.workspaceId)
      .eq("status", "won")
      .eq("is_deleted", false)
      .gte("actual_close_date", thirtyDaysAgo.toISOString().split("T")[0])
      .order("actual_close_date", { ascending: true });

    // Build Map for O(1) lookup per day instead of O(n) filter
    const revenueByDate = new Map<string, number>();
    for (const deal of wonDeals || []) {
      const date = deal.actual_close_date;
      if (date) {
        revenueByDate.set(date, (revenueByDate.get(date) || 0) + (Number(deal.value) || 0));
      }
    }

    const dailyData: { date: string; revenue: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0] ?? "";
      dailyData.push({ date: dateStr, revenue: revenueByDate.get(dateStr) || 0 });
    }

    let cumulative = 0;
    const cumulativeData = dailyData.map((d) => {
      cumulative += d.revenue;
      return { ...d, cumulative };
    });

    return NextResponse.json({ success: true, data: cumulativeData }, {
      headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" },
    });
  }
);
