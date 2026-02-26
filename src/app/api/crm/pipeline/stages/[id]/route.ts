import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { z } from "zod";

const updateStageSchema = z.object({
  rotting_days: z.number().int().min(0).max(365).nullable().optional(),
  name: z.string().min(1).max(100).optional(),
  color: z.string().max(20).optional(),
});

export const PATCH = withApiHandler(
  {
    permission: { resource: "pipeline", action: "manage" },
    bodySchema: updateStageSchema,
    logTag: "PipelineStage",
  },
  async (_request, ctx, { body, routeParams }) => {
    const { id } = routeParams;
    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("deal_stages")
      .update(body)
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .select()
      .single();

    if (dbError) throw new ApiError("Failed to update stage", 500);

    return NextResponse.json({ success: true, data });
  }
);
