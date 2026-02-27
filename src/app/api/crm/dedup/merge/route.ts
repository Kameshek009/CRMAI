import { NextResponse } from "next/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { logAudit } from "@/lib/crm/audit";

export const POST = withApiHandler(
  {
    permission: { resource: "contacts", action: "write" },
    logTag: "DedupMerge",
  },
  async (request, ctx) => {
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

    // Apply field overrides to master (whitelist safe fields only)
    const BLOCKED_FIELDS = new Set([
      "id", "team_id", "account_id", "is_deleted", "deleted_at", "deleted_by", "created_at", "created_by",
    ]);
    if (field_overrides && Object.keys(field_overrides).length > 0) {
      const safeOverrides: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(field_overrides)) {
        if (!BLOCKED_FIELDS.has(key)) safeOverrides[key] = val;
      }
      if (Object.keys(safeOverrides).length === 0) {
        return NextResponse.json({ success: false, error: "No valid field overrides" }, { status: 400 });
      }
      const { error: updateErr } = await supabase
        .from(table)
        .update(safeOverrides)
        .eq("id", master_id)
        .eq("team_id", ctx.workspaceId);

      if (updateErr) throw new ApiError("Failed to update master record", 500);
    }

    // Reassign related records from merged → master
    const fkField = entity_type === "contacts" ? "contact_id" : "company_id";

    const relatedTables = ["deals", "crm_activities", "crm_notes", "crm_tasks"];

    for (const relTable of relatedTables) {
      for (const mergeId of merge_ids) {
        const { error: reassignErr } = await supabase
          .from(relTable)
          .update({ [fkField]: master_id })
          .eq(fkField, mergeId)
          .eq("team_id", ctx.workspaceId);
        if (reassignErr) {
          throw new ApiError(`Failed to reassign ${relTable} records`, 500);
        }
      }
    }

    // Soft-delete merged records
    const now = new Date().toISOString();
    for (const mergeId of merge_ids) {
      const { error: delErr } = await supabase
        .from(table)
        .update({ is_deleted: true, deleted_at: now, deleted_by: ctx.accountId })
        .eq("id", mergeId)
        .eq("team_id", ctx.workspaceId);
      if (delErr) {
        throw new ApiError(`Failed to soft-delete merged record ${mergeId}`, 500);
      }
    }

    // Log merge (non-critical)
    const { error: logErr } = await supabase.from("merge_log").insert({
      team_id: ctx.workspaceId,
      account_id: ctx.accountId,
      entity_type,
      master_id,
      merged_ids: merge_ids,
      merge_details: field_overrides || {},
    });
    if (logErr) {
      // Don't fail the merge if logging fails — just log it
      logAudit({ teamId: ctx.workspaceId, accountId: ctx.accountId, entityType: "merge_log", entityId: master_id, action: "create", changes: { error: { old: null, new: logErr.message } } });
    }

    logAudit({
      teamId: ctx.workspaceId,
      accountId: ctx.accountId,
      entityType: entity_type,
      entityId: master_id,
      action: "update",
      changes: { merge: { old: merge_ids, new: master_id } },
    });

    return NextResponse.json({ success: true, master_id });
  }
);
