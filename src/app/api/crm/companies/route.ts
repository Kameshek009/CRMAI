import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { parseListParams, applyListQuery } from "@/lib/crm/query-builder";
import { createCompanySchema } from "@/lib/crm/validation";
import { logAudit } from "@/lib/crm/audit";
import { logger } from "@/lib/logger";

export const GET = withApiHandler(
  {
    permission: { resource: "companies", action: "read" },
    logTag: "Companies",
  },
  async (request, ctx) => {
    const url = new URL(request.url);
    const params = parseListParams(url);
    const supabase = createSupabaseAdmin();

    let query = supabase
      .from("companies")
      .select("*", { count: "exact" })
      .eq("team_id", ctx.workspaceId)
      .eq("is_deleted", false);

    query = applyListQuery(query, "companies", params, ["name", "industry", "domain"]);

    const { data, error: dbError, count } = await query;

    if (dbError) throw new ApiError("Database operation failed", 500);

    return NextResponse.json({ success: true, data, total: count });
  }
);

export const POST = withApiHandler(
  {
    permission: { resource: "companies", action: "create" },
    featureLimit: "companies",
    bodySchema: createCompanySchema,
    logTag: "Companies",
  },
  async (_request, ctx, { body }) => {
    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("companies")
      .insert({ account_id: ctx.accountId, team_id: ctx.workspaceId, ...body })
      .select()
      .single();

    if (dbError) throw new ApiError("Database operation failed", 500);

    try {
      await supabase.from("crm_activities").insert({
        account_id: ctx.accountId,
        team_id: ctx.workspaceId,
        company_id: data.id,
        type: "company_created",
        title: `Company created: ${data.name}`,
      });
    } catch (e) { logger.error("Companies", "Failed to log activity", e); }

    logAudit({
      teamId: ctx.workspaceId,
      accountId: ctx.accountId,
      entityType: "company",
      entityId: data.id,
      action: "create",
    });

    return NextResponse.json({ success: true, data });
  }
);
