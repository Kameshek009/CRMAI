import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { parseListParams, applyListQuery } from "@/lib/crm/query-builder";
import { createShowingSchema } from "@/lib/crm/validation";
import { logger } from "@/lib/logger";

export const GET = withApiHandler(
  {
    permission: { resource: "deals", action: "read" },
    logTag: "Showings",
  },
  async (request, ctx) => {
    const url = new URL(request.url);
    const params = parseListParams(url);

    const supabase = createSupabaseAdmin();

    let query = supabase
      .from("property_showings")
      .select("*, contacts:contact_id(first_name, last_name), deals:deal_id(title)", { count: "exact" })
      .eq("team_id", ctx.workspaceId)
      .eq("is_deleted", false);

    // Support date range filter for calendar view
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    if (from) query = query.gte("showing_date", from);
    if (to) query = query.lte("showing_date", to);

    query = applyListQuery(query, "showings", params, ["title", "address"]);

    const { data, error: dbError, count } = await query;

    if (dbError) throw new ApiError("Database operation failed", 500);

    return NextResponse.json({ success: true, data, total: count });
  }
);

export const POST = withApiHandler(
  {
    permission: { resource: "deals", action: "create" },
    bodySchema: createShowingSchema,
    logTag: "Showings",
  },
  async (_request, ctx, { body }) => {
    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("property_showings")
      .insert({ account_id: ctx.accountId, team_id: ctx.workspaceId, ...body })
      .select("*, contacts:contact_id(first_name, last_name), deals:deal_id(title)")
      .single();

    if (dbError) throw new ApiError("Database operation failed", 500);

    // Log activity
    try {
      await supabase.from("crm_activities").insert({
        account_id: ctx.accountId,
        team_id: ctx.workspaceId,
        contact_id: body.contact_id || null,
        deal_id: body.deal_id || null,
        type: "meeting",
        title: `Showing scheduled: ${data.title}`,
      });
    } catch (e) { logger.error("Showings", "Failed to log activity", e); }

    return NextResponse.json({ success: true, data });
  }
);
