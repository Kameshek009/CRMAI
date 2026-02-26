import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { requirePermission } from "@/lib/crm/team-helpers";
import { bulkShowingsSchema } from "@/lib/crm/validation";

export const POST = withApiHandler(
  {
    bodySchema: bulkShowingsSchema,
    logTag: "Showings",
  },
  async (_request, ctx, { body }) => {
    const supabase = createSupabaseAdmin();
    const { action, ids } = body;

    if (action === "delete") {
      const permError = requirePermission(ctx.permissions, "deals", "delete", ctx.isOwner);
      if (permError) return permError;

      const { error: dbError } = await supabase
        .from("property_showings")
        .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: ctx.accountId })
        .in("id", ids)
        .eq("team_id", ctx.workspaceId);

      if (dbError) throw new ApiError("Database operation failed", 500);
    } else if (action === "update_status") {
      const permError = requirePermission(ctx.permissions, "deals", "update", ctx.isOwner);
      if (permError) return permError;

      const { error: dbError } = await supabase
        .from("property_showings")
        .update({ status: body.status })
        .in("id", ids)
        .eq("team_id", ctx.workspaceId);

      if (dbError) throw new ApiError("Database operation failed", 500);
    }

    return NextResponse.json({ success: true, affected: ids.length });
  }
);
