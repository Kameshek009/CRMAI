import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { z } from "zod";

const updateSchema = z.object({
  label: z.string().min(1).max(200).optional(),
  position: z.number().optional(),
  is_active: z.boolean().optional(),
});

export const PATCH = withApiHandler(
  {
    permission: { resource: "team_settings", action: "manage" },
    bodySchema: updateSchema,
    logTag: "LostReasons",
  },
  async (_request, ctx, { body, routeParams }) => {
    const { id } = routeParams;
    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("deal_lost_reasons")
      .update(body)
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .select()
      .single();

    if (dbError) throw new ApiError("Failed to update reason", 500);

    return NextResponse.json({ success: true, data });
  }
);

export const DELETE = withApiHandler(
  {
    permission: { resource: "team_settings", action: "manage" },
    logTag: "LostReasons",
  },
  async (_request, ctx, { routeParams }) => {
    const { id } = routeParams;
    const supabase = createSupabaseAdmin();
    const { error: dbError } = await supabase
      .from("deal_lost_reasons")
      .delete()
      .eq("id", id)
      .eq("team_id", ctx.workspaceId);

    if (dbError) throw new ApiError("Failed to delete reason", 500);

    return NextResponse.json({ success: true });
  }
);
