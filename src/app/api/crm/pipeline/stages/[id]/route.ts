import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { z } from "zod";
import { logger } from "@/lib/logger";

const updateStageSchema = z.object({
  rotting_days: z.number().int().min(0).max(365).nullable().optional(),
  name: z.string().min(1).max(100).optional(),
  color: z.string().max(20).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "pipeline", "manage", context.isDirector);
    if (permError) return permError;

    const { id } = await params;
    const body = await request.json();
    const parsed = updateStageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("deal_stages")
      .update(parsed.data)
      .eq("id", id)
      .eq("team_id", context.teamId)
      .select()
      .single();

    if (dbError) {
      logger.error("PipelineStage", "PATCH error", dbError);
      return NextResponse.json({ success: false, error: "Failed to update stage" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("PipelineStage", "PATCH error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
