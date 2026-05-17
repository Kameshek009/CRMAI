import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { updateDealStageSchema } from "@/lib/crm/validation";
import { logger } from "@/lib/logger";
import { enqueueOrLog } from "@/lib/outbox/enqueue";

export const PATCH = withApiHandler(
  {
    permission: { resource: "deals", action: "update" },
    bodySchema: updateDealStageSchema,
    logTag: "Deals",
  },
  async (_request, ctx, { body, routeParams }) => {
    const { id } = routeParams;
    const supabase = createSupabaseAdmin();

    // Get current deal (only if not soft-deleted)
    const { data: deal } = await supabase
      .from("deals")
      .select("id, title, stage_id, value")
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .eq("is_deleted", false)
      .single();

    if (!deal) {
      return NextResponse.json({ success: false, error: "Deal not found" }, { status: 404 });
    }

    // Get new stage info
    const { data: newStage } = await supabase
      .from("deal_stages")
      .select("id, name, is_won, is_lost")
      .eq("id", body.stage_id)
      .eq("team_id", ctx.workspaceId)
      .single();

    if (!newStage) {
      return NextResponse.json({ success: false, error: "Stage not found" }, { status: 404 });
    }

    // Update deal
    const updateData: Record<string, unknown> = { stage_id: body.stage_id };
    if (newStage.is_won) {
      updateData.status = "won";
      updateData.actual_close_date = new Date().toISOString().split("T")[0];
    } else if (newStage.is_lost) {
      updateData.status = "lost";
      updateData.actual_close_date = new Date().toISOString().split("T")[0];
      if (body.lost_reason_id) {
        updateData.lost_reason_id = body.lost_reason_id;
      }
      if (body.lost_reason_note) {
        updateData.lost_reason_note = body.lost_reason_note;
      }
    } else {
      updateData.status = "open";
    }

    const { data: updated, error: dbError } = await supabase
      .from("deals")
      .update(updateData)
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .select("*, deal_stages(id, name, color)")
      .single();

    if (dbError) throw new ApiError("Failed to update stage", 500);

    // Log activity
    try {
      await supabase.from("crm_activities").insert({
        account_id: ctx.accountId,
        team_id: ctx.workspaceId,
        deal_id: id,
        type: newStage.is_won ? "deal_won" : newStage.is_lost ? "deal_lost" : "deal_stage_changed",
        title: `Deal "${deal.title}" moved to ${newStage.name}`,
        metadata: {
          from_stage_id: deal.stage_id,
          to_stage_id: newStage.id,
          value: deal.value,
        },
      });
    } catch (e) { logger.error("Deals", "Failed to log activity", e); }

    const stageEventType = newStage.is_won
      ? "deal.won"
      : newStage.is_lost
        ? "deal.lost"
        : "deal.stage_changed";

    await enqueueOrLog(supabase, {
      teamId: ctx.workspaceId,
      eventType: stageEventType,
      entityType: "deal",
      entityId: id,
      payload: {
        deal_id: id,
        from_stage_id: deal.stage_id,
        to_stage_id: newStage.id,
        value: deal.value,
        status: updateData.status,
        actor_account_id: ctx.accountId,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  }
);
