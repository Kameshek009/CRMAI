import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { ensureDealStages } from "@/lib/crm/helpers";
import { createPipelineStageSchema, reorderStagesSchema } from "@/lib/crm/validation";
import { logger } from "@/lib/logger";

export const GET = withApiHandler(
  {
    permission: { resource: "pipeline", action: "read" },
    logTag: "Pipeline",
  },
  async (_request, ctx) => {
    const supabase = createSupabaseAdmin();
    await ensureDealStages(ctx.accountId, ctx.workspaceId);

    let { data: stages, error: stagesError } = await supabase
      .from("deal_stages")
      .select("*")
      .eq("team_id", ctx.workspaceId)
      .order("position", { ascending: true });

    if (stagesError) throw new ApiError("Failed to fetch stages", 500);

    // Deduplicate stages by name (keep the one with lowest position)
    if (stages && stages.length > 0) {
      const seen = new Map<string, string>(); // name → kept stage id
      const dupeIds: string[] = [];
      const remapStageId = new Map<string, string>(); // dupe id → kept id

      for (const s of stages) {
        const existing = seen.get(s.name);
        if (existing) {
          dupeIds.push(s.id);
          remapStageId.set(s.id, existing);
        } else {
          seen.set(s.name, s.id);
        }
      }

      if (dupeIds.length > 0) {
        logger.warn("Pipeline", `Removing ${dupeIds.length} duplicate stages`, dupeIds);

        // Reassign deals from duplicate stages to the kept ones
        for (const [dupeId, keptId] of remapStageId) {
          await supabase
            .from("deals")
            .update({ stage_id: keptId })
            .eq("stage_id", dupeId)
            .eq("team_id", ctx.workspaceId);
        }

        // Delete duplicate stages
        await supabase
          .from("deal_stages")
          .delete()
          .in("id", dupeIds);

        // Re-fetch clean stages
        const refetch = await supabase
          .from("deal_stages")
          .select("*")
          .eq("team_id", ctx.workspaceId)
          .order("position", { ascending: true });

        stages = refetch.data;
      }
    }

    const { data: deals } = await supabase
      .from("deals")
      .select("*, contacts(id, first_name, last_name), companies(id, name), accounts!deals_assigned_to_fkey(id, name)")
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
