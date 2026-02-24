import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { parseListParams, applyListQuery } from "@/lib/crm/query-builder";
import { createShowingSchema } from "@/lib/crm/validation";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "deals", "read", context.isDirector);
    if (permError) return permError;

    const url = new URL(request.url);
    const params = parseListParams(url);

    const supabase = createSupabaseAdmin();

    let query = supabase
      .from("property_showings")
      .select("*, contacts:contact_id(first_name, last_name), deals:deal_id(title)", { count: "exact" })
      .eq("team_id", context.teamId)
      .eq("is_deleted", false);

    // Support date range filter for calendar view
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    if (from) query = query.gte("showing_date", from);
    if (to) query = query.lte("showing_date", to);

    query = applyListQuery(query, "showings", params, ["title", "address"]);

    const { data, error: dbError, count } = await query;

    if (dbError) {
      logger.error("Showings", "DB error", dbError);
      return NextResponse.json({ success: false, error: "Database operation failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data, total: count });
  } catch (error) {
    logger.error("Showings", "GET error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "deals", "create", context.isDirector);
    if (permError) return permError;

    const body = await request.json();
    const parsed = createShowingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("property_showings")
      .insert({ account_id: context.accountId, team_id: context.teamId, ...parsed.data })
      .select("*, contacts:contact_id(first_name, last_name), deals:deal_id(title)")
      .single();

    if (dbError) {
      logger.error("Showings", "DB error", dbError);
      return NextResponse.json({ success: false, error: "Database operation failed" }, { status: 500 });
    }

    // Log activity
    try {
      await supabase.from("crm_activities").insert({
        account_id: context.accountId,
        team_id: context.teamId,
        contact_id: parsed.data.contact_id || null,
        deal_id: parsed.data.deal_id || null,
        type: "meeting",
        title: `Showing scheduled: ${data.title}`,
      });
    } catch (e) { logger.error("Showings", "Failed to log activity", e); }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("Showings", "POST error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
