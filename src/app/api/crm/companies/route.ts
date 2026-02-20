import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { parseListParams, applyListQuery } from "@/lib/crm/query-builder";
import { createCompanySchema } from "@/lib/crm/validation";
import { logAudit } from "@/lib/crm/audit";
import { requireFeatureLimit } from "@/lib/usage/feature-limits";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "companies", "read", context.isOwner);
    if (permError) return permError;

    const url = new URL(request.url);
    const params = parseListParams(url);

    const supabase = createSupabaseAdmin();

    let query = supabase
      .from("companies")
      .select("*", { count: "exact" })
      .eq("team_id", context.workspaceId)
      .eq("is_deleted", false);

    query = applyListQuery(query, "companies", params, ["name", "industry", "domain"]);

    const { data, error: dbError, count } = await query;

    if (dbError) {
      logger.error("Companies", "DB error", dbError);
      return NextResponse.json({ success: false, error: "Database operation failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data, total: count });
  } catch (error) {
    logger.error("Companies", "GET error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "companies", "create", context.isOwner);
    if (permError) return permError;

    const limitError = await requireFeatureLimit(context.workspaceId, context.tier, "companies");
    if (limitError) return limitError;

    const body = await request.json();
    const parsed = createCompanySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("companies")
      .insert({ account_id: context.accountId, team_id: context.workspaceId, ...parsed.data })
      .select()
      .single();

    if (dbError) {
      logger.error("Companies", "DB error", dbError);
      return NextResponse.json({ success: false, error: "Database operation failed" }, { status: 500 });
    }

    try {
      await supabase.from("crm_activities").insert({
        account_id: context.accountId,
        team_id: context.workspaceId,
        company_id: data.id,
        type: "company_created",
        title: `Company created: ${data.name}`,
      });
    } catch (e) { logger.warn("Companies", "Failed to log activity", e); }

    logAudit({
      teamId: context.workspaceId,
      accountId: context.accountId,
      entityType: "company",
      entityId: data.id,
      action: "create",
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("Companies", "POST error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
