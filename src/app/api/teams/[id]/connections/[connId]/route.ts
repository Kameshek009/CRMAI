import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { requirePermission } from "@/lib/crm/team-helpers";
import { updateConnectionSchema } from "@/lib/crm/team-validation";

export const PATCH = withApiHandler(
  {
    bodySchema: updateConnectionSchema,
    logTag: "TeamConnections",
  },
  async (_request, ctx, { body, routeParams }) => {
    const { id, connId } = routeParams;
    if (ctx.workspaceId !== id) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    const permError = requirePermission(ctx.permissions, "team_settings", "manage", ctx.isOwner);
    if (permError) return permError;

    const supabase = createSupabaseAdmin();

    // Must be the target team to accept/reject
    const { data, error: dbError } = await supabase
      .from("team_connections")
      .update({ status: body.status })
      .eq("id", connId)
      .eq("target_team_id", id)
      .select()
      .single();

    if (dbError) throw new ApiError(dbError.message, 500);

    return NextResponse.json({ success: true, data });
  }
);
