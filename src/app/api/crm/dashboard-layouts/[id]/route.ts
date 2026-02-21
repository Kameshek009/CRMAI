import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext } from "@/lib/crm/team-helpers";
import { z } from "zod";
import { logger } from "@/lib/logger";

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

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, ctx: RouteContext) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const { id } = await ctx.params;
    const body = await request.json();
    const parsed = updateLayoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    // If setting as default, unset other defaults
    if (parsed.data.is_default) {
      await supabase
        .from("dashboard_layouts")
        .update({ is_default: false })
        .eq("team_id", context.workspaceId)
        .eq("account_id", context.accountId);
    }

    const updates: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.widgets !== undefined) updates.widgets = parsed.data.widgets;
    if (parsed.data.is_default !== undefined) updates.is_default = parsed.data.is_default;

    const { data, error: dbError } = await supabase
      .from("dashboard_layouts")
      .update(updates)
      .eq("id", id)
      .eq("team_id", context.workspaceId)
      .eq("account_id", context.accountId)
      .select("*")
      .single();

    if (dbError || !data) {
      return NextResponse.json({ success: false, error: "Layout not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    logger.error("DashboardLayouts", "PATCH error", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, ctx: RouteContext) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const { id } = await ctx.params;
    const supabase = createSupabaseAdmin();

    const { error: dbError } = await supabase
      .from("dashboard_layouts")
      .delete()
      .eq("id", id)
      .eq("team_id", context.workspaceId)
      .eq("account_id", context.accountId);

    if (dbError) {
      logger.error("DashboardLayouts", "Failed to delete", dbError);
      return NextResponse.json({ success: false, error: "Failed to delete" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("DashboardLayouts", "DELETE error", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
