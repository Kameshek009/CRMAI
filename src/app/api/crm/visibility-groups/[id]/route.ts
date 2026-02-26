import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { z } from "zod";

const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  is_default: z.boolean().optional(),
  description: z.string().max(500).optional().nullable(),
  entity_types: z.array(z.string()).optional(),
  rule_type: z.enum(["include", "exclude"]).optional(),
});

export const PATCH = withApiHandler(
  {
    permission: { resource: "team_settings", action: "manage" },
    bodySchema: updateGroupSchema,
    logTag: "VisibilityGroups",
  },
  async (_request, ctx, { body, routeParams }) => {
    const { id } = routeParams;
    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("visibility_groups")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .select()
      .single();

    if (dbError) throw new ApiError("Failed to update group", 500);

    return NextResponse.json({ success: true, data });
  }
);

export const DELETE = withApiHandler(
  {
    permission: { resource: "team_settings", action: "manage" },
    logTag: "VisibilityGroups",
  },
  async (_request, ctx, { routeParams }) => {
    const { id } = routeParams;
    const supabase = createSupabaseAdmin();
    const { error: dbError } = await supabase
      .from("visibility_groups")
      .delete()
      .eq("id", id)
      .eq("team_id", ctx.workspaceId);

    if (dbError) throw new ApiError("Failed to delete group", 500);

    return NextResponse.json({ success: true });
  }
);
