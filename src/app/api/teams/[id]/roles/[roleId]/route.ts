import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { requirePermission } from "@/lib/crm/team-helpers";
import { updateRoleSchema } from "@/lib/crm/team-validation";

export const PATCH = withApiHandler(
  {
    bodySchema: updateRoleSchema,
    logTag: "TeamRoles",
  },
  async (_request, ctx, { body, routeParams }) => {
    const { id, roleId } = routeParams;
    if (ctx.workspaceId !== id) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    const permError = requirePermission(ctx.permissions, "team_settings", "manage", ctx.isOwner);
    if (permError) return permError;

    const supabase = createSupabaseAdmin();

    // Don't allow editing system roles' names
    const { data: existing } = await supabase
      .from("team_roles")
      .select("is_system")
      .eq("id", roleId)
      .eq("team_id", id)
      .single();

    if (!existing) {
      return NextResponse.json({ success: false, error: "Role not found" }, { status: 404 });
    }

    if (existing.is_system) {
      return NextResponse.json({ success: false, error: "Cannot modify system roles" }, { status: 400 });
    }

    const { data, error: dbError } = await supabase
      .from("team_roles")
      .update(body)
      .eq("id", roleId)
      .eq("team_id", id)
      .select()
      .single();

    if (dbError) throw new ApiError(dbError.message, 500);

    return NextResponse.json({ success: true, data });
  }
);

export const DELETE = withApiHandler(
  { logTag: "TeamRoles" },
  async (_request, ctx, { routeParams }) => {
    const { id, roleId } = routeParams;
    if (ctx.workspaceId !== id) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    const permError = requirePermission(ctx.permissions, "team_settings", "manage", ctx.isOwner);
    if (permError) return permError;

    const supabase = createSupabaseAdmin();

    // Don't allow deleting system roles
    const { data: existing } = await supabase
      .from("team_roles")
      .select("is_system")
      .eq("id", roleId)
      .eq("team_id", id)
      .single();

    if (!existing) {
      return NextResponse.json({ success: false, error: "Role not found" }, { status: 404 });
    }

    if (existing.is_system) {
      return NextResponse.json({ success: false, error: "Cannot delete system roles" }, { status: 400 });
    }

    // Check if any members use this role
    const { count } = await supabase
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .eq("role_id", roleId);

    if (count && count > 0) {
      return NextResponse.json({ success: false, error: "Cannot delete role with members. Reassign members first." }, { status: 400 });
    }

    const { error: dbError } = await supabase
      .from("team_roles")
      .delete()
      .eq("id", roleId)
      .eq("team_id", id);

    if (dbError) throw new ApiError(dbError.message, 500);

    return NextResponse.json({ success: true });
  }
);
