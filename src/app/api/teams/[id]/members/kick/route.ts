import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { kickMemberSchema } from "@/lib/crm/team-validation";
import { updateSubscriptionQuantity } from "@/lib/stripe/server";

export async function POST(
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

    // Soft-delete: set status to suspended instead of hard delete
    const { error: dbError } = await supabase
      .from("team_members")
      .update({ status: "suspended" })
      .eq("id", parsed.data.member_id)
      .eq("team_id", id);

    if (dbError) {
      return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
    }

    // Update Stripe subscription quantity (per-seat billing)
    const { data: team } = await supabase
      .from("teams")
      .select("stripe_subscription_id, tier, seat_count")
      .eq("id", id)
      .single();

    if (team?.stripe_subscription_id && team.tier !== "free") {
      const newSeatCount = Math.max(1, (team.seat_count || 1) - 1);
      try {
        await updateSubscriptionQuantity(team.stripe_subscription_id, newSeatCount);
        await supabase
          .from("teams")
          .update({ seat_count: newSeatCount })
          .eq("id", id);
      } catch (err) {
        console.error("[TeamKick] Failed to update Stripe quantity:", err);
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
