import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext } from "@/lib/crm/team-helpers";
import { isValidUUID } from "@/lib/crm/helpers";
import { logger } from "@/lib/logger";

export async function GET(
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

    const url = new URL(request.url);
    const limit = Math.min(50, parseInt(url.searchParams.get("limit") || "20", 10));
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);

    const supabase = createSupabaseAdmin();

    // Verify automation belongs to this team
    const { data: automation } = await supabase
      .from("automations")
      .select("id")
      .eq("id", id)
      .eq("team_id", context.workspaceId)
      .single();

    if (!automation) {
      return NextResponse.json({ success: false, error: "Automation not found" }, { status: 404 });
    }

    const { data, error: dbError, count } = await supabase
      .from("automation_logs")
      .select("*", { count: "exact" })
      .eq("automation_id", id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (dbError) {
      logger.error("Automations", "Failed to fetch logs", dbError);
      return NextResponse.json({ success: false, error: "Failed to fetch logs" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data, total: count });
  } catch (error) {
    logger.error("Automations", "Logs GET error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
