import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { updateTeamSchema } from "@/lib/crm/team-validation";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const { id } = await params;
    if (context.teamId !== id) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    const supabase = createSupabaseAdmin();
    const { data: team, error: dbError } = await supabase
      .from("teams")
      .select("*")
      .eq("id", id)
      .single();

    if (dbError) {
      return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: team });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const { id } = await params;
    if (context.teamId !== id) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    const permError = requirePermission(context.permissions, "team_settings", "manage", context.isDirector);
    if (permError) return permError;

    const body = await request.json();
    const parsed = updateTeamSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("teams")
      .update(parsed.data)
      .eq("id", id)
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const { id } = await params;
    if (context.teamId !== id || !context.isDirector) {
      return NextResponse.json({ success: false, error: "Only the director can delete a team" }, { status: 403 });
    }

    const supabase = createSupabaseAdmin();

    // Soft-delete: set deleted_at instead of hard delete
    const { error: dbError } = await supabase
      .from("teams")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (dbError) {
      return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
    }

    // Clear current_team_id for all members so they don't land on deleted team
    const { data: members } = await supabase
      .from("team_members")
      .select("account_id")
      .eq("team_id", id);

    if (members && members.length > 0) {
      const accountIds = members.map((m) => m.account_id);
      await supabase
        .from("accounts")
        .update({ current_team_id: null })
        .in("id", accountIds)
        .eq("current_team_id", id);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
