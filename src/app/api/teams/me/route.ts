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

    // Filter out soft-deleted teams, but keep track of restorable ones
    const allMemberships = (memberships || []).map((m) => ({
      team: m.teams,
      role: m.team_roles,
      isDirector: m.is_director,
      fixedRole: (m as Record<string, unknown>).fixed_role || (m.is_director ? "owner" : "member"),
      memberId: m.id,
      joinedAt: m.joined_at,
    }));

    const teams = allMemberships.filter(
      (m) => !(m.team as Record<string, unknown>)?.deleted_at
    );

    // Deleted teams that can still be restored (within 24h, director only)
    const deletedTeams = allMemberships
      .filter((m) => {
        const t = m.team as Record<string, unknown>;
        if (!t?.deleted_at || !m.isDirector) return false;
        const deletedAt = new Date(t.deleted_at as string).getTime();
        return Date.now() - deletedAt < 24 * 60 * 60 * 1000;
      })
      .map((m) => ({
        team: m.team,
        deletedAt: (m.team as Record<string, unknown>).deleted_at as string,
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
        deletedTeams,
        currentTeam,
        currentTeamId,
        currentRole,
        isDirector: currentMembership?.is_director || false,
        fixedRole: (currentMembership as Record<string, unknown> | undefined)?.fixed_role || (currentMembership?.is_director ? "owner" : "member"),
        memberId: currentMembership?.id || null,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
