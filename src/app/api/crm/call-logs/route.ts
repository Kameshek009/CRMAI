import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { parseListParams, applyListQuery } from "@/lib/crm/query-builder";
import { createCallLogSchema } from "@/lib/crm/validation";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "call_logs", "read", context.isDirector);
    if (permError) return permError;

    const url = new URL(request.url);
    const params = parseListParams(url);

    const supabase = createSupabaseAdmin();

    let query = supabase
      .from("call_logs")
      .select("*, contacts(id, first_name, last_name)", { count: "exact" })
      .eq("team_id", context.teamId)
      .eq("is_deleted", false);

    query = applyListQuery(query, "call_logs", params, ["from_number", "to_number", "summary"]);

    const { data, error: dbError, count } = await query;

    if (dbError) {
      logger.error("CallLogs", "Failed to fetch call logs", dbError);
      return NextResponse.json({ success: false, error: "Failed to fetch call logs" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data, total: count });
  } catch (error) {
    logger.error("CallLogs", "GET error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "call_logs", "create", context.isDirector);
    if (permError) return permError;

    const body = await request.json();
    const parsed = createCallLogSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("call_logs")
      .insert({
        account_id: context.accountId,
        team_id: context.teamId,
        caller_account_id: context.accountId,
        ...parsed.data,
      })
      .select("*, contacts(id, first_name, last_name)")
      .single();

    if (dbError) {
      logger.error("CallLogs", "Failed to create call log", dbError);
      return NextResponse.json({ success: false, error: "Failed to create call log" }, { status: 500 });
    }

    // Log activity
    try {
      await supabase.from("crm_activities").insert({
        account_id: context.accountId,
        team_id: context.teamId,
        contact_id: parsed.data.contact_id || null,
        deal_id: parsed.data.deal_id || null,
        type: "call",
        title: `${parsed.data.direction === "inbound" ? "Inbound" : "Outbound"} call${parsed.data.status ? ` — ${parsed.data.status}` : ""}`,
        description: parsed.data.summary?.slice(0, 200) || null,
      });
    } catch (e) { logger.warn("CallLogs", "Failed to log activity", e); }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("CallLogs", "POST error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
