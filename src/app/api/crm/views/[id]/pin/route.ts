import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler } from "@/lib/crm/with-api-handler";
import { isValidUUID } from "@/lib/crm/helpers";

export const PATCH = withApiHandler(
  { logTag: "Views/Pin" },
  async (_request, ctx, { routeParams }) => {
    const { id } = routeParams;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    // Get current pin status
    const { data: view, error: fetchError } = await supabase
      .from("saved_views")
      .select("is_pinned")
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .single();

    if (fetchError || !view) {
      return NextResponse.json({ success: false, error: "View not found" }, { status: 404 });
    }

    const { data, error: dbError } = await supabase
      .from("saved_views")
      .update({ is_pinned: !view.is_pinned })
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .select()
      .single();

    if (dbError || !data) {
      return NextResponse.json({ success: false, error: "Failed to toggle pin" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  }
);
