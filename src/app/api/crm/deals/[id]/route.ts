import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { updateDealSchema } from "@/lib/crm/validation";
import { isValidUUID } from "@/lib/crm/helpers";
import { logAudit, computeChanges } from "@/lib/crm/audit";
import { runAutomations } from "@/lib/crm/automation-engine";
import { createNotification } from "@/lib/crm/notifications";
import { logger } from "@/lib/logger";

export const GET = withApiHandler(
  {
    permission: { resource: "deals", action: "read" },
    logTag: "Deals",
  },
  async (_request, ctx, { routeParams }) => {
    const { id } = routeParams;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }
    const supabase = createSupabaseAdmin();

    const { data, error: dbError } = await supabase
      .from("deals")
      .select("*, deal_stages(id, name, color, position, is_won, is_lost), contacts(id, first_name, last_name, email), companies(id, name)")
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .eq("is_deleted", false)
      .single();

    if (dbError || !data) {
      return NextResponse.json({ success: false, error: "Deal not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  }
);

export const PATCH = withApiHandler(
  {
    permission: { resource: "deals", action: "update" },
    bodySchema: updateDealSchema,
    logTag: "Deals",
  },
  async (_request, ctx, { body, routeParams }) => {
    const { id } = routeParams;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    const { data: oldRecord } = await supabase
      .from("deals")
      .select("*")
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .single();

    const { data, error: dbError } = await supabase
      .from("deals")
      .update(body)
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .select("*, deal_stages(id, name, color), contacts(id, first_name, last_name), companies(id, name)")
      .single();

    if (dbError || !data) {
      return NextResponse.json({ success: false, error: "Deal not found" }, { status: 404 });
    }

    try {
      await supabase.from("crm_activities").insert({
        account_id: ctx.accountId,
        team_id: ctx.workspaceId,
        deal_id: id,
        contact_id: data.contact_id,
        company_id: data.company_id,
        type: "deal_updated",
        title: `Deal updated: ${data.title}`,
      });
    } catch (e) { logger.error("Deals", "Failed to log activity", e); }

    const changes = oldRecord ? computeChanges(oldRecord, body) : undefined;
    logAudit({
      teamId: ctx.workspaceId,
      accountId: ctx.accountId,
      entityType: "deal",
      entityId: id,
      action: "update",
      changes,
    });

    // Notify on deal assignment change
    if (changes?.["assigned_to"] && changes["assigned_to"].new && changes["assigned_to"].new !== ctx.accountId) {
      createNotification({
        accountId: changes["assigned_to"].new as string,
        teamId: ctx.workspaceId,
        type: "deal_assigned",
        title: `Deal assigned to you: ${data.title}`,
        entityType: "deal",
        entityId: id,
      });
    }

    // Notify assignee on stage change
    if (changes?.["stage_id"] && oldRecord?.assigned_to && oldRecord.assigned_to !== ctx.accountId) {
      createNotification({
        accountId: oldRecord.assigned_to as string,
        teamId: ctx.workspaceId,
        type: "deal_stage_changed",
        title: `Deal stage changed: ${data.title}`,
        message: `Stage updated to ${data.deal_stages?.name || "new stage"}`,
        entityType: "deal",
        entityId: id,
      });
    }

    const triggerType = changes && changes["stage_id"] ? "deal_stage_changed" as const : "record_updated" as const;
    runAutomations({
      teamId: ctx.workspaceId,
      accountId: ctx.accountId,
      triggerType,
      entityType: "deal",
      entityId: id,
      changes,
      record: data,
    });

    return NextResponse.json({ success: true, data });
  }
);

export const DELETE = withApiHandler(
  {
    permission: { resource: "deals", action: "delete" },
    logTag: "Deals",
  },
  async (_request, ctx, { routeParams }) => {
    const { id } = routeParams;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }
    const supabase = createSupabaseAdmin();

    const { data: existing } = await supabase
      .from("deals")
      .select("title, contact_id, company_id")
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .single();

    const { error: dbError } = await supabase
      .from("deals")
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: ctx.accountId })
      .eq("id", id)
      .eq("team_id", ctx.workspaceId);

    if (dbError) throw new ApiError("Database operation failed", 500);

    try {
      await supabase.from("crm_activities").insert({
        account_id: ctx.accountId,
        team_id: ctx.workspaceId,
        deal_id: id,
        contact_id: existing?.contact_id,
        company_id: existing?.company_id,
        type: "deal_deleted",
        title: `Deal deleted: ${existing?.title || "Unknown"}`,
      });
    } catch (e) { logger.error("Deals", "Failed to log activity", e); }

    logAudit({
      teamId: ctx.workspaceId,
      accountId: ctx.accountId,
      entityType: "deal",
      entityId: id,
      action: "delete",
    });

    return NextResponse.json({ success: true });
  }
);
