import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { requirePermission } from "@/lib/crm/team-helpers";
import { updateAiPermissionsSchema } from "@/lib/crm/team-validation";

export const GET = withApiHandler(
  { logTag: "AiPermissions" },
  async (_request, ctx, { routeParams }) => {
    const { id } = routeParams;
    if (ctx.workspaceId !== id) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("ai_permissions")
      .select("*")
      .eq("team_id", id)
      .single();

    if (dbError) throw new ApiError(dbError.message, 500);

    return NextResponse.json({ success: true, data });
  }
);

export const PATCH = withApiHandler(
  {
    bodySchema: updateAiPermissionsSchema,
    logTag: "AiPermissions",
  },
  async (_request, ctx, { body, routeParams }) => {
    const { id } = routeParams;
    if (ctx.workspaceId !== id) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    const permError = requirePermission(ctx.permissions, "team_settings", "manage", ctx.isOwner);
    if (permError) return permError;

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("ai_permissions")
      .update(body)
      .eq("team_id", id)
      .select()
      .single();

    if (dbError) throw new ApiError(dbError.message, 500);

    return NextResponse.json({ success: true, data });
  }
);
