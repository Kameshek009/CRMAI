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

    // Update team with correct max_members and description
    const updateData: Record<string, unknown> = { max_members: maxMembers };
    if (parsed.data.description) {
      updateData.description = parsed.data.description;
    }

    await supabase
      .from("teams")
      .update(updateData)
      .eq("id", teamId);

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
