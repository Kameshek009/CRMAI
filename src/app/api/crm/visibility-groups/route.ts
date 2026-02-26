import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { z } from "zod";

const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  is_default: z.boolean().optional(),
});

export const GET = withApiHandler(
  {
    permission: { resource: "team_settings", action: "read" },
    logTag: "VisibilityGroups",
  },
  async (_request, ctx) => {
    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("visibility_groups")
      .select("*, visibility_group_members(id, account_id)")
      .eq("team_id", ctx.workspaceId)
      .order("created_at", { ascending: true });

    if (dbError) throw new ApiError("Failed to fetch groups", 500);

    return NextResponse.json({ success: true, data: data || [] });
  }
);

export const POST = withApiHandler(
  {
    permission: { resource: "team_settings", action: "manage" },
    featureLimit: "visibilityGroups",
    bodySchema: createGroupSchema,
    logTag: "VisibilityGroups",
  },
  async (_request, ctx, { body }) => {
    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("visibility_groups")
      .insert({ team_id: ctx.workspaceId, ...body })
      .select()
      .single();

    if (dbError) throw new ApiError("Failed to create group", 500);

    return NextResponse.json({ success: true, data });
  }
);
