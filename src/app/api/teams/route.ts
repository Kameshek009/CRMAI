import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getAccountId } from "@/lib/crm/helpers";
import { createTeamSchema } from "@/lib/crm/team-validation";
import { TIER_MAX_MEMBERS } from "@/lib/constants/tiers";
import type { SubscriptionTier } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const { accountId, error } = await getAccountId();
    if (error) return error;

    const body = await request.json();
    const parsed = createTeamSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    // Enforce 1 active team per account
    const { data: existingTeam } = await supabase
      .from("teams")
      .select("id")
      .eq("owner_account_id", accountId)
      .is("deleted_at", null)
      .single();

    if (existingTeam) {
      return NextResponse.json(
        { success: false, error: "You can only own one team. Delete your current team first." },
        { status: 409 }
      );
    }

    // Validate parentTeamId if provided
    if (parsed.data.parentTeamId) {
      const { data: parentTeam } = await supabase
        .from("teams")
        .select("id")
        .eq("id", parsed.data.parentTeamId)
        .is("deleted_at", null)
        .single();

      if (!parentTeam) {
        return NextResponse.json(
          { success: false, error: "Parent team not found" },
          { status: 404 }
        );
      }
    }

    const { data: teamId, error: rpcError } = await supabase.rpc("create_team_with_defaults", {
      p_account_id: accountId,
      p_team_name: parsed.data.name,
    });

    if (rpcError) {
      return NextResponse.json({ success: false, error: rpcError.message }, { status: 500 });
    }

    // Get account tier to set correct max_members
    const { data: account } = await supabase
      .from("accounts")
      .select("tier")
      .eq("id", accountId)
      .single();

    const tier = (account?.tier || "free") as SubscriptionTier;
    const maxMembers = TIER_MAX_MEMBERS[tier] || TIER_MAX_MEMBERS.free;

    // Update team with correct max_members, description, and parent_team_id
    const updateData: Record<string, unknown> = { max_members: maxMembers };
    if (parsed.data.description) {
      updateData.description = parsed.data.description;
    }
    if (parsed.data.parentTeamId) {
      updateData.parent_team_id = parsed.data.parentTeamId;
    }

    await supabase
      .from("teams")
      .update(updateData)
      .eq("id", teamId);

    // Add members if provided
    if (parsed.data.memberIds && parsed.data.memberIds.length > 0) {
      // Get Member role for the new team
      const { data: memberRole } = await supabase
        .from("team_roles")
        .select("id")
        .eq("team_id", teamId)
        .eq("name", "Member")
        .single();

      if (memberRole) {
        // Respect max_members limit (-1 because owner is already added)
        const membersToAdd = parsed.data.memberIds.slice(0, maxMembers - 1);

        // Verify accounts exist
        const { data: validAccounts } = await supabase
          .from("accounts")
          .select("id")
          .in("id", membersToAdd);

        if (validAccounts && validAccounts.length > 0) {
          const memberInserts = validAccounts.map((acc) => ({
            team_id: teamId,
            account_id: acc.id,
            role_id: memberRole.id,
            is_director: false,
            fixed_role: "member",
            status: "active" as const,
          }));

          await supabase.from("team_members").insert(memberInserts);
        }
      }
    }

    const { data: team } = await supabase
      .from("teams")
      .select("*")
      .eq("id", teamId)
      .single();

    return NextResponse.json({ success: true, data: team });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
