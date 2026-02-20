import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContext } from "@/lib/crm/team-helpers";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { logAudit } from "@/lib/crm/audit";

const TABLE_MAP: Record<string, string> = {
  contacts: "contacts",
  companies: "companies",
  deals: "deals",
  tasks: "crm_tasks",
  notes: "crm_notes",
  call_logs: "call_logs",
};

export async function DELETE(request: NextRequest) {
  const { context, error } = await getWorkspaceContext();
  if (error) return error;

  if (!context.isOwner) {
    return NextResponse.json({ success: false, error: "Only owners can permanently delete" }, { status: 403 });
  }

  const body = await request.json();
  const { entity_type, id } = body;

  if (!entity_type || !id || !TABLE_MAP[entity_type]) {
    return NextResponse.json({ success: false, error: "Invalid entity_type or id" }, { status: 400 });
  }

  const table = TABLE_MAP[entity_type];
  const supabase = createSupabaseAdmin();

  const { error: dbError } = await supabase
    .from(table)
    .delete()
    .eq("id", id)
    .eq("team_id", context.workspaceId)
    .eq("is_deleted", true);

  if (dbError) {
    return NextResponse.json({ success: false, error: "Failed to permanently delete" }, { status: 500 });
  }

  logAudit({
    teamId: context.workspaceId,
    accountId: context.accountId,
    entityType: entity_type,
    entityId: id,
    action: "delete",
  });

  return NextResponse.json({ success: true });
}
