import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { updateTeamSchema } from "@/lib/crm/team-validation";
import { cancelSubscriptionImmediately } from "@/lib/stripe/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const { id } = await params;
    if (context.teamId !== id) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    const supabase = createSupabaseAdmin();
    const { data: team, error: dbError } = await supabase
      .from("teams")
      .select("*")
      .eq("id", id)
      .single();

    if (dbError) {
      return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: team });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
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
    const parsed = updateTeamSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("teams")
      .update(parsed.data)
      .eq("id", id)
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const { id } = await params;
    if (context.teamId !== id || !context.isDirector) {
      return NextResponse.json({ success: false, error: "Only the director can delete a team" }, { status: 403 });
    }

    const supabase = createSupabaseAdmin();

    // Cancel Stripe subscription before deleting
    const { data: teamData } = await supabase
      .from("teams")
      .select("stripe_subscription_id")
      .eq("id", id)
      .single();

    if (teamData?.stripe_subscription_id) {
      try {
        await cancelSubscriptionImmediately(teamData.stripe_subscription_id);
      } catch (err) {
        console.error("[TeamDelete] Failed to cancel subscription:", err);
      }
    }

    // Soft-delete: set deleted_at instead of hard delete
    const { error: dbError } = await supabase
      .from("teams")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (dbError) {
      return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
    }

    // For each member whose current_team_id points to the deleted team,
    // auto-switch them to their next available active team
    const { data: members } = await supabase
      .from("team_members")
      .select("account_id")
      .eq("team_id", id);

    if (members && members.length > 0) {
      for (const member of members) {
        // Check if this account is currently on the deleted team
        const { data: acc } = await supabase
          .from("accounts")
          .select("current_team_id")
          .eq("id", member.account_id)
          .single();

        if (acc?.current_team_id !== id) continue;

        // Find another active team for this member
        const { data: otherMembership } = await supabase
          .from("team_members")
          .select("team_id, teams!inner(deleted_at)")
          .eq("account_id", member.account_id)
          .eq("status", "active")
          .neq("team_id", id)
          .is("teams.deleted_at", null)
          .limit(1)
          .single();

        await supabase
          .from("accounts")
          .update({ current_team_id: otherMembership?.team_id ?? null })
          .eq("id", member.account_id);
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
