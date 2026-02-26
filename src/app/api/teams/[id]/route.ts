import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { requirePermission } from "@/lib/crm/team-helpers";
import { updateTeamSchema } from "@/lib/crm/team-validation";
import { cancelSubscriptionImmediately } from "@/lib/stripe/server";
import { logAudit, computeChanges } from "@/lib/crm/audit";
import { logger } from "@/lib/logger";

export const GET = withApiHandler(
  { logTag: "Team" },
  async (_request, ctx, { routeParams }) => {
    const { id } = routeParams;
    if (ctx.workspaceId !== id) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    const supabase = createSupabaseAdmin();
    const { data: team, error: dbError } = await supabase
      .from("teams")
      .select("*")
      .eq("id", id)
      .single();

    if (dbError) throw new ApiError(dbError.message, 500);

    return NextResponse.json({ success: true, data: team });
  }
);

export const PATCH = withApiHandler(
  {
    bodySchema: updateTeamSchema,
    logTag: "Team",
  },
  async (_request, ctx, { body, routeParams }) => {
    const { id } = routeParams;
    if (ctx.workspaceId !== id) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    const permError = requirePermission(ctx.permissions, "team_settings", "manage", ctx.isOwner);
    if (permError) return permError;

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("teams")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (dbError) throw new ApiError(dbError.message, 500);

    logAudit({
      teamId: id,
      accountId: ctx.accountId,
      entityType: "team",
      entityId: id,
      action: "update",
      changes: computeChanges({}, body as Record<string, unknown>),
    });

    return NextResponse.json({ success: true, data });
  }
);

export const DELETE = withApiHandler(
  { logTag: "Team" },
  async (_request, ctx, { routeParams }) => {
    const { id } = routeParams;
    if (ctx.workspaceId !== id || !ctx.isOwner) {
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
        logger.error("TeamDelete", "Failed to cancel subscription", err);
      }
    }

    // Soft-delete: set deleted_at instead of hard delete
    const { error: dbError } = await supabase
      .from("teams")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (dbError) throw new ApiError(dbError.message, 500);

    logAudit({
      teamId: id,
      accountId: ctx.accountId,
      entityType: "team",
      entityId: id,
      action: "delete",
    });

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
  }
);
