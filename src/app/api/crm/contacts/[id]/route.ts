import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { updateContactSchema } from "@/lib/crm/validation";
import { isValidUUID } from "@/lib/crm/helpers";
import { logAudit, computeChanges } from "@/lib/crm/audit";
import { runAutomations } from "@/lib/crm/automation-engine";
import { logger } from "@/lib/logger";

export const GET = withApiHandler(
  {
    permission: { resource: "contacts", action: "read" },
    logTag: "Contacts",
  },
  async (_request, ctx, { routeParams }) => {
    const { id } = routeParams;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }
    const supabase = createSupabaseAdmin();

    const { data, error: dbError } = await supabase
      .from("contacts")
      .select("*, companies(id, name, industry, domain)")
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .eq("is_deleted", false)
      .single();

    if (dbError || !data) {
      return NextResponse.json({ success: false, error: "Contact not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  }
);

export const PATCH = withApiHandler(
  {
    permission: { resource: "contacts", action: "update" },
    bodySchema: updateContactSchema,
    logTag: "Contacts",
  },
  async (_request, ctx, { body, routeParams }) => {
    const { id } = routeParams;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    // Fetch old record for audit diff
    const { data: oldRecord } = await supabase
      .from("contacts")
      .select("*")
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .single();

    const { data, error: dbError } = await supabase
      .from("contacts")
      .update(body)
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .select("*, companies(id, name)")
      .single();

    if (dbError || !data) {
      return NextResponse.json({ success: false, error: "Contact not found" }, { status: 404 });
    }

    try {
      await supabase.from("crm_activities").insert({
        account_id: ctx.accountId,
        team_id: ctx.workspaceId,
        contact_id: id,
        type: "contact_updated",
        title: `Contact updated: ${data.first_name} ${data.last_name || ""}`.trim(),
      });
    } catch (e) { logger.error("Contacts", "Failed to log activity", e); }

    const changes = oldRecord ? computeChanges(oldRecord, body) : undefined;
    logAudit({
      teamId: ctx.workspaceId,
      accountId: ctx.accountId,
      entityType: "contact",
      entityId: id,
      action: "update",
      changes,
    });

    runAutomations({
      teamId: ctx.workspaceId,
      accountId: ctx.accountId,
      triggerType: "record_updated",
      entityType: "contact",
      entityId: id,
      changes,
      record: data,
    });

    return NextResponse.json({ success: true, data });
  }
);

export const DELETE = withApiHandler(
  {
    permission: { resource: "contacts", action: "delete" },
    logTag: "Contacts",
  },
  async (_request, ctx, { routeParams }) => {
    const { id } = routeParams;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }
    const supabase = createSupabaseAdmin();

    const { data: existing } = await supabase
      .from("contacts")
      .select("first_name, last_name")
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .single();

    const { error: dbError } = await supabase
      .from("contacts")
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: ctx.accountId })
      .eq("id", id)
      .eq("team_id", ctx.workspaceId);

    if (dbError) throw new ApiError("Failed to delete contact", 500);

    try {
      await supabase.from("crm_activities").insert({
        account_id: ctx.accountId,
        team_id: ctx.workspaceId,
        contact_id: id,
        type: "contact_deleted",
        title: `Contact deleted: ${existing?.first_name || ""} ${existing?.last_name || ""}`.trim(),
      });
    } catch (e) { logger.error("Contacts", "Failed to log activity", e); }

    logAudit({
      teamId: ctx.workspaceId,
      accountId: ctx.accountId,
      entityType: "contact",
      entityId: id,
      action: "delete",
    });

    return NextResponse.json({ success: true });
  }
);
