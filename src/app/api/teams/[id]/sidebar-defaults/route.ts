import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { requirePermission } from "@/lib/crm/team-helpers";
import { sidebarConfigSchema } from "@/lib/validations/sidebar";

export const GET = withApiHandler(
  { logTag: "SidebarDefaults" },
  async (_request, ctx, { routeParams }) => {
    const { id } = routeParams;
    if (ctx.workspaceId !== id) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    const { data: team } = await createSupabaseAdmin()
      .from("teams")
      .select("settings")
      .eq("id", id)
      .single();

    return NextResponse.json({
      success: true,
      data: team?.settings?.sidebar_defaults || null,
    });
  }
);

export const PATCH = withApiHandler(
  {
    bodySchema: sidebarConfigSchema,
    logTag: "SidebarDefaults",
  },
  async (_request, ctx, { body, routeParams }) => {
    const { id } = routeParams;
    if (ctx.workspaceId !== id) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    const permError = requirePermission(ctx.permissions, "team_settings", "manage", ctx.isOwner);
    if (permError) return permError;

    const supabase = createSupabaseAdmin();

    // Fetch current settings and merge
    const { data: team } = await supabase
      .from("teams")
      .select("settings")
      .eq("id", id)
      .single();

    const currentSettings = team?.settings || {};
    const newSettings = { ...currentSettings, sidebar_defaults: body };

    const { error: dbError } = await supabase
      .from("teams")
      .update({ settings: newSettings })
      .eq("id", id);

    if (dbError) throw new ApiError(dbError.message, 500);

    return NextResponse.json({ success: true, data: body });
  }
);

export const DELETE = withApiHandler(
  { logTag: "SidebarDefaults" },
  async (_request, ctx, { routeParams }) => {
    const { id } = routeParams;
    if (ctx.workspaceId !== id) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    const permError = requirePermission(ctx.permissions, "team_settings", "manage", ctx.isOwner);
    if (permError) return permError;

    const supabase = createSupabaseAdmin();

    const { data: team } = await supabase
      .from("teams")
      .select("settings")
      .eq("id", id)
      .single();

    const currentSettings = team?.settings || {};
    delete currentSettings.sidebar_defaults;

    const { error: dbError } = await supabase
      .from("teams")
      .update({ settings: currentSettings })
      .eq("id", id);

    if (dbError) throw new ApiError(dbError.message, 500);

    return NextResponse.json({ success: true });
  }
);
