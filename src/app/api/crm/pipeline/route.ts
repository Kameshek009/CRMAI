import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { ensureDealStages } from "@/lib/crm/helpers";
import { createPipelineStageSchema, reorderStagesSchema } from "@/lib/crm/validation";

export const GET = withApiHandler(
  {
    permission: { resource: "pipeline", action: "read" },
    logTag: "Pipeline",
  },
  async (_request, ctx) => {
    const supabase = createSupabaseAdmin();
    await ensureDealStages(ctx.accountId, ctx.workspaceId);

    const { data: stages, error: stagesError } = await supabase
      .from("deal_stages")
      .select("*")
      .eq("team_id", ctx.workspaceId)
      .order("position", { ascending: true });

    if (stagesError) throw new ApiError("Failed to fetch stages", 500);

    const { data: deals } = await supabase
      .from("deals")
      .select("*, contacts(id, first_name, last_name), companies(id, name), accounts!deals_assigned_to_fkey(id, first_name, last_name)")
      .eq("team_id", ctx.workspaceId)
      .eq("is_deleted", false)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(2000);

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
  }
);

export const POST = withApiHandler(
  {
    permission: { resource: "pipeline", action: "manage" },
    featureLimit: "pipelineStages",
    bodySchema: createPipelineStageSchema,
    logTag: "Pipeline",
  },
  async (_request, ctx, { body }) => {
    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("deal_stages")
      .insert({ account_id: ctx.accountId, team_id: ctx.workspaceId, ...body })
      .select()
      .single();

    if (dbError) throw new ApiError("Failed to create stage", 500);

    return NextResponse.json({ success: true, data });
  }
);

export const PATCH = withApiHandler(
  {
    permission: { resource: "pipeline", action: "manage" },
    bodySchema: reorderStagesSchema,
    logTag: "Pipeline",
  },
  async (_request, ctx, { body }) => {
    const supabase = createSupabaseAdmin();

    await Promise.all(
      body.stages.map((stage: { id: string; position: number }) =>
        supabase
          .from("deal_stages")
          .update({ position: stage.position })
          .eq("id", stage.id)
          .eq("team_id", ctx.workspaceId)
      )
    );

    return NextResponse.json({ success: true });
  }
);
