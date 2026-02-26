import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { requirePermission } from "@/lib/crm/team-helpers";
import { updateMemberRoleSchema } from "@/lib/crm/team-validation";
import { logAudit } from "@/lib/crm/audit";

export const PATCH = withApiHandler(
  {
    bodySchema: updateMemberRoleSchema,
    logTag: "TeamMembers",
  },
  async (_request, ctx, { body, routeParams }) => {
    const { id, memberId } = routeParams;
    if (ctx.workspaceId !== id) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    const permError = requirePermission(ctx.permissions, "team_settings", "manage", ctx.isOwner);
    if (permError) return permError;

    const supabase = createSupabaseAdmin();

    // Don't allow changing the owner's role
    const { data: targetMember } = await supabase
      .from("team_members")
      .select("is_director")
      .eq("id", memberId)
      .eq("team_id", id)
      .single();

    if (!targetMember) {
      return NextResponse.json({ success: false, error: "Member not found" }, { status: 404 });
    }

    if (targetMember.is_director) {
      return NextResponse.json({ success: false, error: "Cannot change owner's role" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};

    // Update fixed_role (for Free/Pro tiers)
    if (body.fixed_role) {
      updateData.fixed_role = body.fixed_role;
    }

    // Update role_id (for Max/Enterprise tiers with custom roles)
    if (body.role_id) {
      // Verify the role belongs to this team
      const { data: role } = await supabase
        .from("team_roles")
        .select("id")
        .eq("id", body.role_id)
        .eq("team_id", id)
        .single();

      if (!role) {
        return NextResponse.json({ success: false, error: "Role not found in this workspace" }, { status: 404 });
      }

      updateData.role_id = body.role_id;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, error: "No changes provided" }, { status: 400 });
    }

    const { data, error: dbError } = await supabase
      .from("team_members")
      .update(updateData)
      .eq("id", memberId)
      .eq("team_id", id)
      .select("*, team_roles(*)")
      .single();

    if (dbError) throw new ApiError(dbError.message, 500);

    logAudit({
      teamId: id,
      accountId: ctx.accountId,
      entityType: "team_member",
      entityId: memberId ?? "",
      action: "update",
      changes: Object.fromEntries(
        Object.entries(updateData).map(([k, v]) => [k, { old: null, new: v }])
      ),
    });

    return NextResponse.json({ success: true, data });
  }
);
