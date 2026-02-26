import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { isValidUUID } from "@/lib/crm/helpers";

export const GET = withApiHandler(
  { logTag: "Automations" },
  async (request, ctx, { routeParams }) => {
    const { id } = routeParams;
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
      .eq("team_id", ctx.workspaceId)
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

    if (dbError) throw new ApiError("Failed to fetch logs", 500);

    return NextResponse.json({ success: true, data, total: count });
  }
);
