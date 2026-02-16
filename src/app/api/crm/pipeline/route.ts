import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { ensureDealStages } from "@/lib/crm/helpers";
import { createPipelineStageSchema, reorderStagesSchema } from "@/lib/crm/validation";

export async function GET() {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "pipeline", "read");
    if (permError) return permError;

    const supabase = createSupabaseAdmin();
    await ensureDealStages(context.accountId, context.teamId);

    // Get stages with deal counts
    const { data: stages, error: stagesError } = await supabase
      .from("deal_stages")
      .select("*")
      .eq("team_id", context.teamId)
      .order("position", { ascending: true });

    if (stagesError) {
      return NextResponse.json({ success: false, error: stagesError.message }, { status: 500 });
    }

    // Get all open deals for pipeline view
    const { data: deals } = await supabase
      .from("deals")
      .select("*, contacts(id, first_name, last_name), companies(id, name)")
      .eq("team_id", context.teamId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    // Build pipeline columns
    const columns = stages!.map((stage) => {
      const stageDeals = (deals || []).filter((d) => d.stage_id === stage.id);
      return {
        stage,
        deals: stageDeals,
        totalValue: stageDeals.reduce((sum, d) => sum + Number(d.value), 0),
        count: stageDeals.length,
      };
    });

    const totalValue = columns.reduce((sum, col) => sum + col.totalValue, 0);
    const openColumns = columns.filter((c) => !c.stage.is_won && !c.stage.is_lost);
    const weightedForecast = (deals || [])
      .filter((d) => d.status === "open")
      .reduce((sum, d) => sum + Number(d.value) * (d.ai_win_probability / 100), 0);

    return NextResponse.json({
      success: true,
      data: {
        columns,
        totalValue,
        weightedForecast: Math.round(weightedForecast),
        openDealsCount: openColumns.reduce((sum, c) => sum + c.count, 0),
      },
    });
  } catch (error) {
    console.error("[API crm/pipeline GET]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "pipeline", "manage");
    if (permError) return permError;

    const body = await request.json();
    const parsed = createPipelineStageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("deal_stages")
      .insert({ account_id: context.accountId, team_id: context.teamId, ...parsed.data })
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[API crm/pipeline POST]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "pipeline", "manage");
    if (permError) return permError;

    const body = await request.json();
    const parsed = reorderStagesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    // Update positions in order
    for (const stage of parsed.data.stages) {
      await supabase
        .from("deal_stages")
        .update({ position: stage.position })
        .eq("id", stage.id)
        .eq("team_id", context.teamId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API crm/pipeline PATCH]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
