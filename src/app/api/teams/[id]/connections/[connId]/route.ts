import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { updateConnectionSchema } from "@/lib/crm/team-validation";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; connId: string }> }
) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const { id, connId } = await params;
    if (context.teamId !== id) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    const permError = requirePermission(context.permissions, "team_settings", "manage");
    if (permError) return permError;

    const body = await request.json();
    const parsed = updateConnectionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    // Must be the target team to accept/reject
    const { data, error: dbError } = await supabase
      .from("team_connections")
      .update({ status: parsed.data.status })
      .eq("id", connId)
      .eq("target_team_id", id)
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
