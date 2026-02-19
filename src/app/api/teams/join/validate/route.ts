import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getAccountId } from "@/lib/crm/helpers";
import { TIER_MAX_MEMBERS } from "@/lib/constants/tiers";
import type { SubscriptionTier } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const { error } = await getAccountId();
    if (error) return error;

    const code = new URL(request.url).searchParams.get("code");
    if (!code) {
      return NextResponse.json({ success: false, error: "Code required" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    const { data: team } = await supabase
      .from("teams")
      .select("id, name, description, max_members, tier")
      .eq("invite_code", code)
      .single();

    if (!team) {
      return NextResponse.json({ success: false, error: "Invalid invite code" }, { status: 404 });
    }

    const { count } = await supabase
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .eq("team_id", team.id)
      .eq("status", "active");

    // Use tier-based max_members (authoritative)
    const maxMembers = TIER_MAX_MEMBERS[(team.tier as SubscriptionTier) || "free"] ?? team.max_members;

    return NextResponse.json({
      success: true,
      data: {
        id: team.id,
        name: team.name,
        description: team.description,
        memberCount: count || 0,
        maxMembers,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
