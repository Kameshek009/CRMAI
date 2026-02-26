import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { requirePermission } from "@/lib/crm/team-helpers";

export const POST = withApiHandler(
  { logTag: "InviteCode" },
  async (_request, ctx, { routeParams }) => {
    const { id } = routeParams;
    if (ctx.workspaceId !== id) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    const permError = requirePermission(ctx.permissions, "team_settings", "manage", ctx.isOwner);
    if (permError) return permError;

    const supabase = createSupabaseAdmin();

    // Generate cryptographically strong invite code
    const bytes = new Uint8Array(9);
    crypto.getRandomValues(bytes);
    const code = Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 12);

    const { data, error: dbError } = await supabase
      .from("teams")
      .update({ invite_code: code })
      .eq("id", id)
      .select("invite_code")
      .single();

    if (dbError) throw new ApiError(dbError.message, 500);

    return NextResponse.json({ success: true, data });
  }
);
