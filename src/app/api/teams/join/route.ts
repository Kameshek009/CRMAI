import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getAccountId } from "@/lib/crm/helpers";
import { joinTeamSchema } from "@/lib/crm/team-validation";

export async function POST(request: NextRequest) {
  try {
    const { accountId, error } = await getAccountId();
    if (error) return error;

    const body = await request.json();
    const parsed = joinTeamSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid invite code" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    // Find team by invite code
    const { data: team } = await supabase
      .from("teams")
      .select("id, name, max_members")
      .eq("invite_code", parsed.data.invite_code)
      .single();

    if (!team) {
      return NextResponse.json({ success: false, error: "Invalid invite code" }, { status: 404 });
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from("team_members")
      .select("id")
      .eq("team_id", team.id)
      .eq("account_id", accountId)
      .single();

    if (existing) {
      return NextResponse.json({ success: false, error: "Already a member of this team" }, { status: 409 });
    }

    // Check member count
    const { count } = await supabase
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .eq("team_id", team.id)
      .eq("status", "active");

    if (count !== null && count >= team.max_members) {
      return NextResponse.json({ success: false, error: "Team is full" }, { status: 403 });
    }

    // Get default Member role
    const { data: memberRole } = await supabase
      .from("team_roles")
      .select("id")
      .eq("team_id", team.id)
      .eq("name", "Member")
      .single();

    if (!memberRole) {
      return NextResponse.json({ success: false, error: "Team role not found" }, { status: 500 });
    }

    // Add as member
    const { error: joinError } = await supabase
      .from("team_members")
      .insert({
        team_id: team.id,
        account_id: accountId,
        role_id: memberRole.id,
        is_director: false,
        status: "active",
      });

    if (joinError) {
      return NextResponse.json({ success: false, error: joinError.message }, { status: 500 });
    }

    // Switch to this team
    await supabase
      .from("accounts")
      .update({ current_team_id: team.id })
      .eq("id", accountId);

    return NextResponse.json({ success: true, data: { teamId: team.id, teamName: team.name } });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
