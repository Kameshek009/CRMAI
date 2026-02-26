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

const purgeSchema = z.object({
  entity_type: z.string(),
  id: z.string().uuid(),
});

export const DELETE = withApiHandler(
  {
    bodySchema: purgeSchema,
    logTag: "Trash",
  },
  async (_request, ctx, { body }) => {
    if (!ctx.isOwner) {
      return NextResponse.json({ success: false, error: "Only owners can permanently delete" }, { status: 403 });
    }

    const { entity_type, id } = body;

    if (!TABLE_MAP[entity_type]) {
      return NextResponse.json({ success: false, error: "Invalid entity_type" }, { status: 400 });
    }

    const table = TABLE_MAP[entity_type];
    const supabase = createSupabaseAdmin();

    const { error: dbError } = await supabase
      .from(table)
      .delete()
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .eq("is_deleted", true);

    if (dbError) throw new ApiError("Failed to permanently delete", 500);

    logAudit({
      teamId: ctx.workspaceId,
      accountId: ctx.accountId,
      entityType: entity_type,
      entityId: id,
      action: "delete",
    });

    return NextResponse.json({ success: true });
  }
);
