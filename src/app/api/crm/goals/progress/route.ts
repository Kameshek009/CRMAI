import { NextResponse } from "next/server";
import { getWorkspaceContext } from "@/lib/crm/team-helpers";
import { createSupabaseAdmin } from "@/lib/supabase/server";

interface GoalProgress {
  goal_id: string;
  current_value: number;
  target_value: number;
  percentage: number;
  status: "on_track" | "at_risk" | "behind";
}

export async function GET() {
  const { context, error } = await getWorkspaceContext();
  if (error) return error;

  const supabase = createSupabaseAdmin();

  const { data: goals } = await supabase
    .from("goals")
    .select("*")
    .eq("team_id", context.workspaceId)
    .eq("is_active", true);

  if (!goals || goals.length === 0) {
    return NextResponse.json({ success: true, data: [] });
  }

  const progressList: GoalProgress[] = [];

  for (const goal of goals) {
    const startDate = goal.start_date as string;
    const endDate = goal.end_date as string;
    const targetValue = Number(goal.target_value);
    const accountFilter = goal.account_id ? { account_id: goal.account_id } : null;
    let currentValue = 0;

    if (goal.type === "revenue") {
      let query = supabase
        .from("deals")
        .select("value")
        .eq("team_id", context.workspaceId)
        .eq("is_deleted", false)
        .eq("status", "won")
        .gte("updated_at", startDate)
        .lte("updated_at", endDate);

      if (accountFilter) {
        query = query.eq("assigned_to", accountFilter.account_id);
      }

      const { data: deals } = await query;
      currentValue = (deals || []).reduce((sum, d) => sum + (Number(d.value) || 0), 0);
    } else if (goal.type === "deals_won") {
      let query = supabase
        .from("deals")
        .select("id", { count: "exact", head: true })
        .eq("team_id", context.workspaceId)
        .eq("is_deleted", false)
        .eq("status", "won")
        .gte("updated_at", startDate)
        .lte("updated_at", endDate);

      if (accountFilter) {
        query = query.eq("assigned_to", accountFilter.account_id);
      }

      const { count } = await query;
      currentValue = count || 0;
    } else if (goal.type === "deals_created") {
      let query = supabase
        .from("deals")
        .select("id", { count: "exact", head: true })
        .eq("team_id", context.workspaceId)
        .eq("is_deleted", false)
        .gte("created_at", startDate)
        .lte("created_at", endDate);

      if (accountFilter) {
        query = query.eq("assigned_to", accountFilter.account_id);
      }

      const { count } = await query;
      currentValue = count || 0;
    } else if (goal.type === "contacts_created") {
      let query = supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("team_id", context.workspaceId)
        .eq("is_deleted", false)
        .gte("created_at", startDate)
        .lte("created_at", endDate);

      if (accountFilter) {
        query = query.eq("created_by", accountFilter.account_id);
      }

      const { count } = await query;
      currentValue = count || 0;
    } else if (goal.type === "activities_logged") {
      let query = supabase
        .from("crm_activities")
        .select("id", { count: "exact", head: true })
        .eq("team_id", context.workspaceId)
        .gte("created_at", startDate)
        .lte("created_at", endDate);

      if (accountFilter) {
        query = query.eq("account_id", accountFilter.account_id);
      }

      const { count } = await query;
      currentValue = count || 0;
    }

    const percentage = targetValue > 0 ? Math.round((currentValue / targetValue) * 100) : 0;

    // Calculate expected progress based on time elapsed
    const totalDays = (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000;
    const elapsed = (Date.now() - new Date(startDate).getTime()) / 86400000;
    const expectedPct = totalDays > 0 ? Math.round((elapsed / totalDays) * 100) : 100;

    let status: "on_track" | "at_risk" | "behind" = "on_track";
    if (percentage < expectedPct * 0.5) {
      status = "behind";
    } else if (percentage < expectedPct * 0.8) {
      status = "at_risk";
    }

    progressList.push({
      goal_id: goal.id as string,
      current_value: currentValue,
      target_value: targetValue,
      percentage,
      status,
    });
  }

  return NextResponse.json({ success: true, data: progressList });
}
