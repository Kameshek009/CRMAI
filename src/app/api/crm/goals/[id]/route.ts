import { NextResponse } from "next/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { updateGoalSchema } from "@/lib/crm/validation";

export const PATCH = withApiHandler(
  {
    bodySchema: updateGoalSchema,
    logTag: "Goals",
  },
  async (_request, ctx, { body, routeParams }) => {
    const { id } = routeParams;
    const supabase = createSupabaseAdmin();

    const { data, error: dbError } = await supabase
      .from("goals")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .select()
      .single();

    if (dbError || !data) throw new ApiError("Failed to update goal", 500);

    return NextResponse.json({ success: true, data });
  }
);

export const DELETE = withApiHandler(
  { logTag: "Goals" },
  async (_request, ctx, { routeParams }) => {
    const { id } = routeParams;
    const supabase = createSupabaseAdmin();

    const { error: dbError } = await supabase
      .from("goals")
      .update({ is_active: false })
      .eq("id", id)
      .eq("team_id", ctx.workspaceId);

    if (dbError) throw new ApiError("Failed to delete goal", 500);

    return NextResponse.json({ success: true });
  }
);
