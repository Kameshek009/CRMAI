import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { logAudit } from "@/lib/crm/audit";
import { z } from "zod";

const TABLE_MAP: Record<string, string> = {
  contacts: "contacts",
  companies: "companies",
  deals: "deals",
  tasks: "crm_tasks",
  notes: "crm_notes",
  call_logs: "call_logs",
};

const restoreSchema = z.object({
  entity_type: z.string(),
  id: z.string().uuid(),
});

export const POST = withApiHandler(
  {
    bodySchema: restoreSchema,
    logTag: "Trash",
  },
  async (_request, ctx, { body }) => {
    const { entity_type, id } = body;

    if (!TABLE_MAP[entity_type]) {
      return NextResponse.json({ success: false, error: "Invalid entity_type" }, { status: 400 });
    }

    const table = TABLE_MAP[entity_type];
    const supabase = createSupabaseAdmin();

    const { error: dbError } = await supabase
      .from(table)
      .update({ is_deleted: false, deleted_at: null, deleted_by: null })
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .eq("is_deleted", true);

    if (dbError) throw new ApiError("Failed to restore", 500);

    logAudit({
      teamId: ctx.workspaceId,
      accountId: ctx.accountId,
      entityType: entity_type,
      entityId: id,
      action: "update",
    });

    return NextResponse.json({ success: true });
  }
);
