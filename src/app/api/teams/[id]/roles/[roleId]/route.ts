import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { updateRoleSchema } from "@/lib/crm/team-validation";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; roleId: string }> }
) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const { id, roleId } = await params;
    if (context.teamId !== id) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    const permError = requirePermission(context.permissions, "team_settings", "manage");
    if (permError) return permError;

    const body = await request.json();
    const parsed = updateRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input" }, { status: 400 });
    }

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

    if (existing.is_system && parsed.data.name) {
      return NextResponse.json({ success: false, error: "Cannot rename system roles" }, { status: 400 });
    }

    const { data, error: dbError } = await supabase
      .from("team_roles")
      .update(parsed.data)
      .eq("id", roleId)
      .eq("team_id", id)
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; roleId: string }> }
) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const { id, roleId } = await params;
    if (context.teamId !== id) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    const permError = requirePermission(context.permissions, "team_settings", "manage");
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

    if (dbError) {
      return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
