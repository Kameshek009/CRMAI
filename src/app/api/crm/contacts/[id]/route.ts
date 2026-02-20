import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { updateContactSchema } from "@/lib/crm/validation";
import { isValidUUID } from "@/lib/crm/helpers";
import { logAudit, computeChanges } from "@/lib/crm/audit";
import { runAutomations } from "@/lib/crm/automation-engine";
import { logger } from "@/lib/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "contacts", "read", context.isOwner);
    if (permError) return permError;

    const { id } = await params;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }
    const supabase = createSupabaseAdmin();

    const { data, error: dbError } = await supabase
      .from("contacts")
      .select("*, companies(id, name, industry, domain)")
      .eq("id", id)
      .eq("team_id", context.workspaceId)
      .eq("is_deleted", false)
      .single();

    if (dbError || !data) {
      return NextResponse.json({ success: false, error: "Contact not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("Contacts", "GET error", error);
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

    const permError = requirePermission(context.permissions, "contacts", "update", context.isOwner);
    if (permError) return permError;

    const { id } = await params;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }
    const body = await request.json();
    const parsed = updateContactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    // Fetch old record for audit diff
    const { data: oldRecord } = await supabase
      .from("contacts")
      .select("*")
      .eq("id", id)
      .eq("team_id", context.workspaceId)
      .single();

    const { data, error: dbError } = await supabase
      .from("contacts")
      .update(parsed.data)
      .eq("id", id)
      .eq("team_id", context.workspaceId)
      .select("*, companies(id, name)")
      .single();

    if (dbError || !data) {
      return NextResponse.json({ success: false, error: "Contact not found" }, { status: 404 });
    }

    try {
      await supabase.from("crm_activities").insert({
        account_id: context.accountId,
        team_id: context.workspaceId,
        contact_id: id,
        type: "contact_updated",
        title: `Contact updated: ${data.first_name} ${data.last_name || ""}`.trim(),
      });
    } catch (e) { logger.warn("Contacts", "Failed to log activity", e); }

    // Audit log with changes
    const changes = oldRecord ? computeChanges(oldRecord, parsed.data) : undefined;
    logAudit({
      teamId: context.workspaceId,
      accountId: context.accountId,
      entityType: "contact",
      entityId: id,
      action: "update",
      changes,
    });

    // Run automations (fire-and-forget)
    runAutomations({
      teamId: context.workspaceId,
      accountId: context.accountId,
      triggerType: "record_updated",
      entityType: "contact",
      entityId: id,
      changes,
      record: data,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("Contacts", "PATCH error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "contacts", "delete", context.isOwner);
    if (permError) return permError;

    const { id } = await params;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }
    const supabase = createSupabaseAdmin();

    const { data: existing } = await supabase
      .from("contacts")
      .select("first_name, last_name")
      .eq("id", id)
      .eq("team_id", context.workspaceId)
      .single();

    const { error: dbError } = await supabase
      .from("contacts")
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: context.accountId })
      .eq("id", id)
      .eq("team_id", context.workspaceId);

    if (dbError) {
      logger.error("Contacts", "Failed to delete contact", dbError);
      return NextResponse.json({ success: false, error: "Failed to delete contact" }, { status: 500 });
    }

    try {
      await supabase.from("crm_activities").insert({
        account_id: context.accountId,
        team_id: context.workspaceId,
        contact_id: id,
        type: "contact_deleted",
        title: `Contact deleted: ${existing?.first_name || ""} ${existing?.last_name || ""}`.trim(),
      });
    } catch (e) { logger.warn("Contacts", "Failed to log activity", e); }

    // Audit log
    logAudit({
      teamId: context.workspaceId,
      accountId: context.accountId,
      entityType: "contact",
      entityId: id,
      action: "delete",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Contacts", "DELETE error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
