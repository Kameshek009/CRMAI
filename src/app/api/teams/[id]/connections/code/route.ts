import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/crm/with-api-handler";
import { requirePermission } from "@/lib/crm/team-helpers";

export const POST = withApiHandler(
  { logTag: "TeamConnections" },
  async (_request, ctx, { routeParams }) => {
    const { id } = routeParams;
    if (ctx.workspaceId !== id) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    const permError = requirePermission(ctx.permissions, "team_settings", "manage", ctx.isOwner);
    if (permError) return permError;

    const supabase = createSupabaseAdmin();
    const { data: team } = await supabase
      .from("teams")
      .select("invite_code")
      .eq("id", id)
      .single();

    return NextResponse.json({ success: true, data: { connection_code: team?.invite_code } });
  }
);
