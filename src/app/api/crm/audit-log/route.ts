import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "team_settings", "read", context.isOwner);
    if (permError) return permError;

    const url = new URL(request.url);
    const entityType = url.searchParams.get("entity_type");
    const entityId = url.searchParams.get("entity_id");
    const action = url.searchParams.get("action");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "25", 10)));
    const offset = (page - 1) * limit;

    const supabase = createSupabaseAdmin();

    let query = supabase
      .from("audit_log")
      .select("*", { count: "exact" })
      .eq("team_id", context.workspaceId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (entityType) {
      query = query.eq("entity_type", entityType);
    }
    if (entityId) {
      query = query.eq("entity_id", entityId);
    }
    if (action) {
      query = query.eq("action", action);
    }
    if (from) {
      query = query.gte("created_at", from);
    }
    if (to) {
      query = query.lte("created_at", to);
    }

    const { data, count, error: dbError } = await query;

    if (dbError) {
      logger.error("AuditLog", "GET error", dbError);
      return NextResponse.json({ success: false, error: "Failed to fetch audit log" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      total: count || 0,
      page,
      limit,
    });
  } catch (err) {
    logger.error("AuditLog", "GET error", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
