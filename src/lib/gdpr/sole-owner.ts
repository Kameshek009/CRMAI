import { SupabaseClient } from "@supabase/supabase-js";

export type BlockingTeam = {
  team_id: string;
  team_name: string;
  other_active_members: number;
};

// Returns the teams that would be orphaned if `accountId` were deleted —
// teams the account owns where other people still have active memberships.
// Empty array means the deletion can proceed.
export async function findBlockingOwnedTeams(
  supabase: SupabaseClient,
  accountId: string,
): Promise<BlockingTeam[]> {
  const { data: ownedTeams, error } = await supabase
    .from("teams")
    .select("id, name")
    .eq("owner_account_id", accountId);
  if (error) throw error;
  if (!ownedTeams || ownedTeams.length === 0) return [];

  const blocking: BlockingTeam[] = [];
  for (const team of ownedTeams) {
    const { count } = await supabase
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .eq("team_id", team.id)
      .eq("status", "active")
      .neq("account_id", accountId);
    if ((count ?? 0) > 0) {
      blocking.push({
        team_id: team.id,
        team_name: team.name,
        other_active_members: count ?? 0,
      });
    }
  }
  return blocking;
}
