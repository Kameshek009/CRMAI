import { NextResponse } from "next/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { isValidUUID } from "@/lib/crm/helpers";

export const DELETE = withApiHandler(
  {
    permission: { resource: "team_settings", action: "manage" },
    logTag: "ApiKeys",
  },
  async (_request, ctx, { routeParams }) => {
    const { id } = routeParams;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data: existing } = await supabase
      .from("api_keys")
      .select("id, revoked_at")
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ success: false, error: "API key not found" }, { status: 404 });
    }
    if (existing.revoked_at) {
      return NextResponse.json({ success: false, error: "Already revoked" }, { status: 400 });
    }

    const { error } = await supabase
      .from("api_keys")
      .update({
        revoked_at: new Date().toISOString(),
        revoked_reason: "manual_revocation",
      })
      .eq("id", id)
      .eq("team_id", ctx.workspaceId);

    if (error) throw new ApiError("Failed to revoke API key", 500);

    return NextResponse.json({ success: true });
  },
);
