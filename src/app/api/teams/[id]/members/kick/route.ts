import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { requirePermission } from "@/lib/crm/team-helpers";
import { kickMemberSchema } from "@/lib/crm/team-validation";
import { updateSubscriptionQuantity } from "@/lib/stripe/server";
import { logAudit } from "@/lib/crm/audit";
import { logger } from "@/lib/logger";

export const POST = withApiHandler(
  {
    bodySchema: kickMemberSchema,
    logTag: "TeamKick",
  },
  async (_request, ctx, { body, routeParams }) => {
    const { id } = routeParams;
    if (ctx.workspaceId !== id) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    const permError = requirePermission(ctx.permissions, "team_settings", "manage", ctx.isOwner);
    if (permError) return permError;

    // Prevent kicking yourself
    if (body.member_id === ctx.memberId) {
      return NextResponse.json({ success: false, error: "Cannot kick yourself" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    // Check target is not a director
    const { data: target } = await supabase
      .from("team_members")
      .select("is_director")
      .eq("id", body.member_id)
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
      .eq("id", body.member_id)
      .eq("team_id", id);

    if (dbError) throw new ApiError(dbError.message, 500);

    logAudit({
      teamId: id,
      accountId: ctx.accountId,
      entityType: "team_member",
      entityId: body.member_id,
      action: "delete",
    });

    // Atomically sync seat_count and update Stripe
    const { data: team } = await supabase
      .from("teams")
      .select("stripe_subscription_id, tier")
      .eq("id", id)
      .single();

    if (team?.stripe_subscription_id && team.tier !== "free") {
      try {
        const { data: result } = await supabase.rpc("sync_seat_count", { p_team_id: id });
        const newSeatCount = result ?? 1;
        await updateSubscriptionQuantity(team.stripe_subscription_id, newSeatCount);
      } catch (err) {
        logger.error("TeamKick", "Failed to update Stripe quantity", err);
      }
    }

    return NextResponse.json({ success: true });
  }
);
