import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext } from "@/lib/crm/team-helpers";
import { isValidUUID } from "@/lib/crm/helpers";
import { logger } from "@/lib/logger";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const { id } = await params;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    // Get current pin status
    const { data: view, error: fetchError } = await supabase
      .from("saved_views")
      .select("is_pinned")
      .eq("id", id)
      .eq("team_id", context.teamId)
      .single();

    if (fetchError || !view) {
      return NextResponse.json({ success: false, error: "View not found" }, { status: 404 });
    }

    const { data, error: dbError } = await supabase
      .from("saved_views")
      .update({ is_pinned: !view.is_pinned })
      .eq("id", id)
      .eq("team_id", context.teamId)
      .select()
      .single();

    if (dbError || !data) {
      return NextResponse.json({ success: false, error: "Failed to toggle pin" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("Views/Pin", "PATCH error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
