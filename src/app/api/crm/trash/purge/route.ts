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
};

const purgeSchema = z.object({
  entity_type: z.string(),
  id: z.string().uuid().optional(),
  ids: z.array(z.string().uuid()).optional(),
}).refine((d) => d.id || (d.ids && d.ids.length > 0), { message: "id or ids required" });

export const DELETE = withApiHandler(
  {
    bodySchema: purgeSchema,
    logTag: "Trash",
  },
  async (_request, ctx, { body }) => {
    if (!ctx.isOwner) {
      return NextResponse.json({ success: false, error: "Only owners can permanently delete" }, { status: 403 });
    }

    const { entity_type } = body;
    const ids = body.ids ?? (body.id ? [body.id] : []);

    if (!TABLE_MAP[entity_type]) {
      return NextResponse.json({ success: false, error: "Invalid entity_type" }, { status: 400 });
    }

    const table = TABLE_MAP[entity_type];
    const supabase = createSupabaseAdmin();

    const { error: dbError } = await supabase
      .from(table)
      .delete()
      .in("id", ids)
      .eq("team_id", ctx.workspaceId)
      .eq("is_deleted", true);

    if (dbError) throw new ApiError("Failed to permanently delete", 500);

    for (const entityId of ids) {
      logAudit({
        teamId: ctx.workspaceId,
        accountId: ctx.accountId,
        entityType: entity_type,
        entityId,
        action: "delete",
      });
    }

    return NextResponse.json({ success: true, deleted: ids.length });
  }
);
