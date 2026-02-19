import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { updateMemberRoleSchema } from "@/lib/crm/team-validation";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const { id, memberId } = await params;
    if (context.teamId !== id) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    const permError = requirePermission(context.permissions, "team_settings", "manage", context.isDirector);
    if (permError) return permError;

    const body = await request.json();
    const parsed = updateMemberRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input" }, { status: 400 });
    }

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
    if (parsed.data.fixed_role) {
      updateData.fixed_role = parsed.data.fixed_role;
    }

    // Update role_id (for Max/Enterprise tiers with custom roles)
    if (parsed.data.role_id) {
      // Verify the role belongs to this team
      const { data: role } = await supabase
        .from("team_roles")
        .select("id")
        .eq("id", parsed.data.role_id)
        .eq("team_id", id)
        .single();

      if (!role) {
        return NextResponse.json({ success: false, error: "Role not found in this workspace" }, { status: 404 });
      }

      updateData.role_id = parsed.data.role_id;
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

    if (dbError) {
      return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
