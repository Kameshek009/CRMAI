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

    // Verify the role belongs to this team
    const { data: role } = await supabase
      .from("team_roles")
      .select("id")
      .eq("id", parsed.data.role_id)
      .eq("team_id", id)
      .single();

    if (!role) {
      return NextResponse.json({ success: false, error: "Role not found in this team" }, { status: 404 });
    }

    const { data, error: dbError } = await supabase
      .from("team_members")
      .update({ role_id: parsed.data.role_id })
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
