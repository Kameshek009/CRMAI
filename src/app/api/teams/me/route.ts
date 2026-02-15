import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getAccountId } from "@/lib/crm/helpers";

export async function GET() {
  try {
    const { accountId, teamId: currentTeamId, error } = await getAccountId();
    if (error) return error;

    const supabase = createSupabaseAdmin();

    // Get all team memberships for this account
    const { data: memberships, error: memberError } = await supabase
      .from("team_members")
      .select("*, teams(*), team_roles(*)")
      .eq("account_id", accountId)
      .eq("status", "active");

    if (memberError) {
      return NextResponse.json({ success: false, error: memberError.message }, { status: 500 });
    }

    const teams = (memberships || []).map((m) => ({
      team: m.teams,
      role: m.team_roles,
      isDirector: m.is_director,
      memberId: m.id,
      joinedAt: m.joined_at,
    }));

    // Get current team details
    let currentTeam = null;
    let currentRole = null;
    let currentMembership = null;

    if (currentTeamId) {
      currentMembership = (memberships || []).find(
        (m) => (m.teams as { id: string })?.id === currentTeamId
      );
      if (currentMembership) {
        currentTeam = currentMembership.teams;
        currentRole = currentMembership.team_roles;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        teams,
        currentTeam,
        currentTeamId,
        currentRole,
        isDirector: currentMembership?.is_director || false,
        memberId: currentMembership?.id || null,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
