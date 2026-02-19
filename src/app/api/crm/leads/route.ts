import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { parseListParams, applyListQuery, applyVisibilityFilter } from "@/lib/crm/query-builder";
import { createLeadSchema } from "@/lib/crm/validation";
import { logAudit } from "@/lib/crm/audit";
import { runAutomations } from "@/lib/crm/automation-engine";
import { requireFeatureLimit } from "@/lib/usage/feature-limits";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "leads", "read", context.isOwner);
    if (permError) return permError;

    const url = new URL(request.url);
    const params = parseListParams(url);

    const supabase = createSupabaseAdmin();

    let query = supabase
      .from("leads")
      .select("*", { count: "exact" })
      .eq("team_id", context.workspaceId)
      .eq("is_deleted", false);

    query = applyVisibilityFilter(query, "leads", {
      accountId: context.accountId,
      isOwner: context.isOwner,
      fixedRole: context.fixedRole,
    });

    query = applyListQuery(query, "leads", params, ["first_name", "last_name", "email", "organization"]);

    const { data, error: dbError, count } = await query;

    if (dbError) {
      logger.error("Leads", "Failed to fetch leads", dbError);
      return NextResponse.json({ success: false, error: "Failed to fetch leads" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data, total: count });
  } catch (error) {
    logger.error("Leads", "GET error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "leads", "create", context.isOwner);
    if (permError) return permError;

    const limitError = await requireFeatureLimit(context.workspaceId, context.tier, "leads");
    if (limitError) return limitError;

    const body = await request.json();
    const parsed = createLeadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("leads")
      .insert({ account_id: context.accountId, team_id: context.workspaceId, ...parsed.data })
      .select()
      .single();

    if (dbError) {
      logger.error("Leads", "Failed to create lead", dbError);
      return NextResponse.json({ success: false, error: "Failed to create lead" }, { status: 500 });
    }

    try {
      await supabase.from("crm_activities").insert({
        account_id: context.accountId,
        team_id: context.workspaceId,
        lead_id: data.id,
        type: "lead_created",
        title: `Lead created: ${data.first_name} ${data.last_name || ""}`.trim(),
      });
    } catch (e) { logger.warn("Leads", "Failed to log activity", e); }

    logAudit({
      teamId: context.workspaceId,
      accountId: context.accountId,
      entityType: "lead",
      entityId: data.id,
      action: "create",
    });

    runAutomations({
      teamId: context.workspaceId,
      accountId: context.accountId,
      triggerType: "record_created",
      entityType: "lead",
      entityId: data.id,
      record: data,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("Leads", "POST error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
