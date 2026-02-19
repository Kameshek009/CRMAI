import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext } from "@/lib/crm/team-helpers";
import { isValidUUID } from "@/lib/crm/helpers";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const url = new URL(request.url);
    const entityType = url.searchParams.get("entity_type");
    const entityId = url.searchParams.get("entity_id");
    const limit = Math.min(100, parseInt(url.searchParams.get("limit") || "50", 10));
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));

    const supabase = createSupabaseAdmin();

    let query = supabase
      .from("audit_log")
      .select("*", { count: "exact" })
      .eq("team_id", context.workspaceId)
      .order("created_at", { ascending: false });

    if (entityType) {
      query = query.eq("entity_type", entityType);
    }
    if (entityId && isValidUUID(entityId)) {
      query = query.eq("entity_id", entityId);
    }

    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error: dbError, count } = await query;

    if (dbError) {
      logger.error("Audit", "Failed to fetch audit log", dbError);
      return NextResponse.json({ success: false, error: "Failed to fetch audit log" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data, total: count });
  } catch (error) {
    logger.error("Audit", "GET error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
