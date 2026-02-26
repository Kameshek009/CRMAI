import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { isValidUUID } from "@/lib/crm/helpers";

export const GET = withApiHandler(
  { logTag: "Audit" },
  async (request, ctx) => {
    const url = new URL(request.url);
    const entityType = url.searchParams.get("entity_type");
    const entityId = url.searchParams.get("entity_id");
    const limit = Math.min(100, parseInt(url.searchParams.get("limit") || "50", 10));
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));

    const supabase = createSupabaseAdmin();

    let query = supabase
      .from("audit_log")
      .select("*", { count: "exact" })
      .eq("team_id", ctx.workspaceId)
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

    if (dbError) throw new ApiError("Failed to fetch audit log", 500);

    return NextResponse.json({ success: true, data, total: count });
  }
);
