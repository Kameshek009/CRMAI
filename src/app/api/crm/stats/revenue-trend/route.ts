import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";

export async function GET() {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "analytics", "read");
    if (permError) return permError;

    const supabase = createSupabaseAdmin();
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: wonDeals } = await supabase
      .from("deals")
      .select("value, actual_close_date")
      .eq("team_id", context.teamId)
      .eq("status", "won")
      .eq("is_deleted", false)
      .gte("actual_close_date", thirtyDaysAgo.toISOString().split("T")[0])
      .order("actual_close_date", { ascending: true });

    const dailyData: { date: string; revenue: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayRevenue = (wonDeals || [])
        .filter((deal) => deal.actual_close_date === dateStr)
        .reduce((sum, deal) => sum + Number(deal.value), 0);
      dailyData.push({ date: dateStr, revenue: dayRevenue });
    }

    let cumulative = 0;
    const cumulativeData = dailyData.map((d) => {
      cumulative += d.revenue;
      return { ...d, cumulative };
    });

    return NextResponse.json({ success: true, data: cumulativeData });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
