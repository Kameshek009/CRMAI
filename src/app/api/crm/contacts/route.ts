import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { parseListParams, applyListQuery } from "@/lib/crm/query-builder";
import { createContactSchema } from "@/lib/crm/validation";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "contacts", "read", context.isDirector);
    if (permError) return permError;

    const url = new URL(request.url);
    const params = parseListParams(url);

    const supabase = createSupabaseAdmin();

    let query = supabase
      .from("contacts")
      .select("*, companies(id, name)", { count: "exact" })
      .eq("team_id", context.teamId)
      .eq("is_deleted", false);

    query = applyListQuery(query, "contacts", params, ["first_name", "last_name", "email"]);

    const { data, error: dbError, count } = await query;

    if (dbError) {
      logger.error("Contacts", "Failed to fetch contacts", dbError);
      return NextResponse.json({ success: false, error: "Failed to fetch contacts" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data, total: count });
  } catch (error) {
    logger.error("Contacts", "GET error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "contacts", "create", context.isDirector);
    if (permError) return permError;

    const body = await request.json();
    const parsed = createContactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("contacts")
      .insert({ account_id: context.accountId, team_id: context.teamId, ...parsed.data })
      .select("*, companies(id, name)")
      .single();

    if (dbError) {
      logger.error("Contacts", "Failed to create contact", dbError);
      return NextResponse.json({ success: false, error: "Failed to create contact" }, { status: 500 });
    }

    // Log activity
    try {
      await supabase.from("crm_activities").insert({
        account_id: context.accountId,
        team_id: context.teamId,
        contact_id: data.id,
        company_id: data.company_id,
        type: "contact_created",
        title: `Contact created: ${data.first_name} ${data.last_name || ""}`.trim(),
      });
    } catch (e) { logger.warn("Contacts", "Failed to log activity", e); }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("Contacts", "POST error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
