import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContext } from "@/lib/crm/team-helpers";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { logAudit } from "@/lib/crm/audit";

export async function POST(request: NextRequest) {
  const { context, error } = await getWorkspaceContext();
  if (error) return error;

  const body = await request.json();
  const { entity_type, master_id, merge_ids, field_overrides } = body as {
    entity_type: string;
    master_id: string;
    merge_ids: string[];
    field_overrides?: Record<string, unknown>;
  };

  if (!entity_type || !master_id || !merge_ids || merge_ids.length === 0) {
    return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
  }

  if (!["contacts", "companies"].includes(entity_type)) {
    return NextResponse.json({ success: false, error: "Invalid entity_type" }, { status: 400 });
  }

  if (merge_ids.includes(master_id)) {
    return NextResponse.json({ success: false, error: "master_id cannot be in merge_ids" }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  const table = entity_type === "contacts" ? "contacts" : "companies";

  // Apply field overrides to master
  if (field_overrides && Object.keys(field_overrides).length > 0) {
    const { error: updateErr } = await supabase
      .from(table)
      .update(field_overrides)
      .eq("id", master_id)
      .eq("team_id", context.workspaceId);

    if (updateErr) {
      return NextResponse.json({ success: false, error: "Failed to update master record" }, { status: 500 });
    }
  }

  // Reassign related records from merged → master
  const fkField = entity_type === "contacts" ? "contact_id" : "company_id";

  const relatedTables = ["deals", "crm_activities", "crm_notes", "crm_tasks", "call_logs"];

  for (const relTable of relatedTables) {
    for (const mergeId of merge_ids) {
      await supabase
        .from(relTable)
        .update({ [fkField]: master_id })
        .eq(fkField, mergeId)
        .eq("team_id", context.workspaceId);
    }
  }

  // Soft-delete merged records
  const now = new Date().toISOString();
  for (const mergeId of merge_ids) {
    await supabase
      .from(table)
      .update({ is_deleted: true, deleted_at: now, deleted_by: context.accountId })
      .eq("id", mergeId)
      .eq("team_id", context.workspaceId);
  }

  // Log merge
  await supabase.from("merge_log").insert({
    team_id: context.workspaceId,
    account_id: context.accountId,
    entity_type,
    master_id,
    merged_ids: merge_ids,
    merge_details: field_overrides || {},
  });

  logAudit({
    teamId: context.workspaceId,
    accountId: context.accountId,
    entityType: entity_type,
    entityId: master_id,
    action: "update",
    changes: { merge: { old: merge_ids, new: master_id } },
  });

  return NextResponse.json({ success: true, master_id });
}
