import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { z } from "zod";

const updateLayoutSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  widgets: z.array(z.object({
    i: z.string(),
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
    type: z.string(),
    config: z.record(z.string(), z.unknown()).optional(),
  })).optional(),
  is_default: z.boolean().optional(),
});

export const PATCH = withApiHandler(
  {
    bodySchema: updateLayoutSchema,
    logTag: "DashboardLayouts",
  },
  async (_request, ctx, { body, routeParams }) => {
    const { id } = routeParams;
    const supabase = createSupabaseAdmin();

    // If setting as default, unset other defaults
    if (body.is_default) {
      await supabase
        .from("dashboard_layouts")
        .update({ is_default: false })
        .eq("team_id", ctx.workspaceId)
        .eq("account_id", ctx.accountId);
    }

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.widgets !== undefined) updates.widgets = body.widgets;
    if (body.is_default !== undefined) updates.is_default = body.is_default;

    const { data, error: dbError } = await supabase
      .from("dashboard_layouts")
      .update(updates)
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .eq("account_id", ctx.accountId)
      .select("*")
      .single();

    if (dbError || !data) {
      return NextResponse.json({ success: false, error: "Layout not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  }
);

export const DELETE = withApiHandler(
  { logTag: "DashboardLayouts" },
  async (_request, ctx, { routeParams }) => {
    const { id } = routeParams;
    const supabase = createSupabaseAdmin();

    const { error: dbError } = await supabase
      .from("dashboard_layouts")
      .delete()
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .eq("account_id", ctx.accountId);

    if (dbError) throw new ApiError("Failed to delete", 500);

    return NextResponse.json({ success: true });
  }
);
