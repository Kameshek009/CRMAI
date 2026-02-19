import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { parseListParams, applyListQuery, applyVisibilityFilter } from "@/lib/crm/query-builder";
import { ensureDealStages } from "@/lib/crm/helpers";
import { createDealSchema } from "@/lib/crm/validation";
import { logAudit } from "@/lib/crm/audit";
import { runAutomations } from "@/lib/crm/automation-engine";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "deals", "read", context.isOwner);
    if (permError) return permError;

    const url = new URL(request.url);
    const params = parseListParams(url);

    const supabase = createSupabaseAdmin();
    await ensureDealStages(context.accountId, context.workspaceId);

    let query = supabase
      .from("deals")
      .select("*, deal_stages(id, name, color, position, is_won, is_lost), contacts(id, first_name, last_name), companies(id, name)", { count: "exact" })
      .eq("team_id", context.workspaceId)
      .eq("is_deleted", false);

    query = applyVisibilityFilter(query, "deals", {
      accountId: context.accountId,
      isOwner: context.isOwner,
      fixedRole: context.fixedRole,
    });

    query = applyListQuery(query, "deals", params, ["title"]);

    const { data, error: dbError, count } = await query;

    if (dbError) {
      logger.error("Deals", "DB error", dbError);
      return NextResponse.json({ success: false, error: "Database operation failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data, total: count });
  } catch (error) {
    logger.error("Deals", "GET error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "deals", "create", context.isOwner);
    if (permError) return permError;

    const body = await request.json();
    const parsed = createDealSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("deals")
      .insert({ account_id: context.accountId, team_id: context.workspaceId, ...parsed.data })
      .select("*, deal_stages(id, name, color), contacts(id, first_name, last_name), companies(id, name)")
      .single();

    if (dbError) {
      logger.error("Deals", "DB error", dbError);
      return NextResponse.json({ success: false, error: "Database operation failed" }, { status: 500 });
    }

    // Log activity
    try {
      await supabase.from("crm_activities").insert({
        account_id: context.accountId,
        team_id: context.workspaceId,
        deal_id: data.id,
        contact_id: data.contact_id,
        company_id: data.company_id,
        type: "deal_created",
        title: `Deal created: ${data.title}`,
        metadata: { value: data.value },
      });
    } catch (e) { logger.warn("Deals", "Failed to log activity", e); }

    logAudit({
      teamId: context.workspaceId,
      accountId: context.accountId,
      entityType: "deal",
      entityId: data.id,
      action: "create",
    });

    runAutomations({
      teamId: context.workspaceId,
      accountId: context.accountId,
      triggerType: "record_created",
      entityType: "deal",
      entityId: data.id,
      record: data,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("Deals", "POST error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
