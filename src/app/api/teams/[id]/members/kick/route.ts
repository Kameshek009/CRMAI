import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext } from "@/lib/crm/team-helpers";
import { kickMemberSchema } from "@/lib/crm/team-validation";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const { id } = await params;
    if (context.teamId !== id || !context.isDirector) {
      return NextResponse.json({ success: false, error: "Only directors can kick members" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = kickMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input" }, { status: 400 });
    }

    // Prevent kicking yourself
    if (parsed.data.member_id === context.memberId) {
      return NextResponse.json({ success: false, error: "Cannot kick yourself" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    // Check target is not a director
    const { data: target } = await supabase
      .from("team_members")
      .select("is_director")
      .eq("id", parsed.data.member_id)
      .eq("team_id", id)
      .single();

    if (!target) {
      return NextResponse.json({ success: false, error: "Member not found" }, { status: 404 });
    }

    if (target.is_director) {
      return NextResponse.json({ success: false, error: "Cannot kick another director" }, { status: 403 });
    }

    const { error: dbError } = await supabase
      .from("team_members")
      .delete()
      .eq("id", parsed.data.member_id)
      .eq("team_id", id);

    if (dbError) {
      return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
