import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext } from "@/lib/crm/team-helpers";
import { logger } from "@/lib/logger";
import type { SavedViewRow } from "@/types/crm";
import { transformSavedViewRow } from "@/types/crm";

export async function GET() {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const supabase = createSupabaseAdmin();

    const { data, error: dbError } = await supabase
      .from("saved_views")
      .select("*")
      .eq("team_id", context.teamId)
      .eq("is_pinned", true)
      .order("position", { ascending: true })
      .order("created_at", { ascending: false });

    if (dbError) {
      logger.error("Views/Pinned", "GET error", dbError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch pinned views" },
        { status: 500 }
      );
    }

    const views = (data as SavedViewRow[]).map(transformSavedViewRow);

    return NextResponse.json({ success: true, data: views });
  } catch (error) {
    logger.error("Views/Pinned", "GET error", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
