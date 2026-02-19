import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { ensureDealStages } from "@/lib/crm/helpers";
import { createPipelineStageSchema, reorderStagesSchema } from "@/lib/crm/validation";
import { requireFeatureLimit } from "@/lib/usage/feature-limits";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "pipeline", "read", context.isDirector);
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
      logger.error("Pipeline", "Failed to fetch stages", stagesError);
      return NextResponse.json({ success: false, error: "Failed to fetch stages" }, { status: 500 });
    }

    // Get all open deals for pipeline view
    const { data: deals } = await supabase
      .from("deals")
      .select("*, contacts(id, first_name, last_name), companies(id, name)")
      .eq("team_id", context.teamId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    // Build pipeline columns (with deal rotting detection)
    const now = Date.now();
    const columns = stages!.map((stage) => {
      const rottingDays = stage.rotting_days as number | null;
      const stageDeals = (deals || [])
        .filter((d) => d.stage_id === stage.id)
        .map((d) => {
          let is_rotting = false;
          if (rottingDays && rottingDays > 0 && d.status === "open" && d.updated_at) {
            const updatedAt = new Date(d.updated_at).getTime();
            is_rotting = (now - updatedAt) > rottingDays * 86_400_000;
          }
          return { ...d, is_rotting };
        });
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
    logger.error("Pipeline", "GET error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "pipeline", "manage", context.isDirector);
    if (permError) return permError;

    const limitError = await requireFeatureLimit(context.teamId, context.tier, "pipelineStages");
    if (limitError) return limitError;

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
      logger.error("Pipeline", "Failed to create stage", dbError);
      return NextResponse.json({ success: false, error: "Failed to create stage" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("Pipeline", "POST error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "pipeline", "manage", context.isDirector);
    if (permError) return permError;

    const body = await request.json();
    const parsed = reorderStagesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    // Batch update positions using Promise.all instead of sequential N+1
    await Promise.all(
      parsed.data.stages.map((stage) =>
        supabase
          .from("deal_stages")
          .update({ position: stage.position })
          .eq("id", stage.id)
          .eq("team_id", context.teamId)
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Pipeline", "PATCH error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
