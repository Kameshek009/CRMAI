import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/crm/with-api-handler";

export const GET = withApiHandler(
  {
    permission: { resource: "analytics", action: "read" },
    logTag: "Forecast",
  },
  async (_request, ctx) => {
    const supabase = createSupabaseAdmin();
    const now = new Date();

    // Fetch all deals
    const { data: allDeals } = await supabase
      .from("deals")
      .select("id, value, status, stage_id, ai_win_probability, created_at, actual_close_date, expected_close_date, deal_stages(id, name, color, position, is_won, is_lost)")
      .eq("team_id", ctx.workspaceId)
      .eq("is_deleted", false);

    const deals = allDeals || [];
    const wonDeals = deals.filter((d) => d.status === "won");
    const lostDeals = deals.filter((d) => d.status === "lost");
    const openDeals = deals.filter((d) => d.status === "open");

    // Fetch stages
    const { data: stages } = await supabase
      .from("deal_stages")
      .select("id, name, color, position, is_won, is_lost")
      .eq("team_id", ctx.workspaceId)
      .order("position", { ascending: true });

    // --- Win rates per stage ---
    const stageBreakdown = (stages || [])
      .filter((s) => !s.is_won && !s.is_lost)
      .map((stage) => {
        const stageDeals = openDeals.filter((d) => d.stage_id === stage.id);
        const totalValue = stageDeals.reduce((sum, d) => sum + Number(d.value), 0);

        // Historical win rate for deals that passed through this stage
        const historicalDeals = deals.filter((d) => {
          const ds = d.deal_stages as unknown as { position?: number } | null;
          return (d.status === "won" || d.status === "lost") && ds && ds.position !== undefined;
        });

        // Approximate: deals at this position or beyond that won
        const atOrBeyond = historicalDeals.filter((d) => {
          const ds = d.deal_stages as unknown as { position?: number } | null;
          return ds && ds.position !== undefined && ds.position >= stage.position;
        });
        const wonAtStage = atOrBeyond.filter((d) => d.status === "won").length;
        const stageWinRate = atOrBeyond.length > 0
          ? Math.round((wonAtStage / atOrBeyond.length) * 100)
          : Math.round(stage.position * 15 + 10); // fallback estimate

        const weightedValue = Math.round(totalValue * (stageWinRate / 100));

        return {
          id: stage.id,
          name: stage.name,
          color: stage.color,
          position: stage.position,
          dealCount: stageDeals.length,
          totalValue,
          winRate: stageWinRate,
          weightedValue,
        };
      });

    // --- Average sales cycle ---
    const closedWithDates = wonDeals.filter((d) => d.actual_close_date && d.created_at);
    const avgCycleTime = closedWithDates.length > 0
      ? Math.round(
          closedWithDates.reduce((sum, d) => {
            return sum + (new Date(d.actual_close_date!).getTime() - new Date(d.created_at).getTime()) / 86400000;
          }, 0) / closedWithDates.length
        )
      : 30; // default 30 days

    // --- Overall win rate ---
    const winRate = (wonDeals.length + lostDeals.length) > 0
      ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100)
      : 0;

    // --- Monthly historical revenue (last 12 months) ---
    const monthlyHistory: { month: string; revenue: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const mDeals = wonDeals.filter((d) => {
        if (!d.actual_close_date) return false;
        const cd = new Date(d.actual_close_date);
        return cd >= mStart && cd <= mEnd;
      });
      monthlyHistory.push({
        month: mStart.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        revenue: mDeals.reduce((sum, d) => sum + Number(d.value), 0),
      });
    }

    // --- Seasonal coefficients ---
    const monthTotals: number[] = new Array(12).fill(0);
    const monthCounts: number[] = new Array(12).fill(0);
    wonDeals.forEach((d) => {
      if (d.actual_close_date) {
        const m = new Date(d.actual_close_date).getMonth();
        monthTotals[m]! += Number(d.value);
        monthCounts[m]!++;
      }
    });
    const avgMonthly = monthTotals.reduce((a, b) => a + b, 0) / 12;
    const seasonalCoeffs = monthTotals.map((total) =>
      avgMonthly > 0 ? Number((total / avgMonthly).toFixed(2)) : 1
    );

    // --- Weighted pipeline total ---
    const weightedPipeline = stageBreakdown.reduce((sum, s) => sum + s.weightedValue, 0);

    // --- 3 Scenarios for 30/60/90 days ---
    const scenarios: { days: number; best: number; expected: number; worst: number }[] = [];
    for (const days of [30, 60, 90]) {
      const futureDate = new Date(now);
      futureDate.setDate(futureDate.getDate() + days);

      // Deals expected to close within window
      const eligibleDeals = openDeals.filter((d) => {
        if (!d.expected_close_date) return true; // no date = include
        return new Date(d.expected_close_date) <= futureDate;
      });

      const totalEligible = eligibleDeals.reduce((sum, d) => sum + Number(d.value), 0);
      const weightedEligible = eligibleDeals.reduce(
        (sum, d) => sum + Number(d.value) * ((d.ai_win_probability || 50) / 100), 0
      );

      // Apply seasonal coefficient for target month
      const targetMonth = futureDate.getMonth();
      const seasonal = seasonalCoeffs[targetMonth] || 1;

      scenarios.push({
        days,
        best: Math.round(totalEligible * 0.9 * seasonal),
        expected: Math.round(weightedEligible * seasonal),
        worst: Math.round(weightedEligible * 0.5 * seasonal),
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        stageBreakdown,
        weightedPipeline,
        winRate,
        avgCycleTime,
        scenarios,
        monthlyHistory,
        seasonalCoeffs,
        openDealsCount: openDeals.length,
        totalPipelineValue: openDeals.reduce((sum, d) => sum + Number(d.value), 0),
      },
    }, {
      headers: { "Cache-Control": "private, max-age=120, stale-while-revalidate=600" },
    });
  }
);
