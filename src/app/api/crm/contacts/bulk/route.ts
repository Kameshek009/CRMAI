import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { requirePermission } from "@/lib/crm/team-helpers";
import { bulkContactsSchema } from "@/lib/crm/validation";

export const POST = withApiHandler(
  {
    bodySchema: bulkContactsSchema,
    logTag: "CrmContactsBulk",
  },
  async (_request, ctx, { body }) => {
    const supabase = createSupabaseAdmin();
    const { action, ids } = body;

    if (action === "delete") {
      const permError = requirePermission(ctx.permissions, "contacts", "delete", ctx.isOwner);
      if (permError) return permError;

      const { error: dbError } = await supabase
        .from("contacts")
        .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: ctx.accountId })
        .in("id", ids)
        .eq("account_id", ctx.accountId)
        .eq("team_id", ctx.workspaceId);

      if (dbError) throw new ApiError(dbError.message, 500);

      return NextResponse.json({ success: true, deleted: ids.length });
    }

    if (action === "update_status") {
      const permError = requirePermission(ctx.permissions, "contacts", "update", ctx.isOwner);
      if (permError) return permError;

      const { status } = body;
      const { error: dbError } = await supabase
        .from("contacts")
        .update({ status })
        .in("id", ids)
        .eq("account_id", ctx.accountId)
        .eq("team_id", ctx.workspaceId);

      if (dbError) throw new ApiError(dbError.message, 500);

      return NextResponse.json({ success: true, updated: ids.length });
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  }
);
