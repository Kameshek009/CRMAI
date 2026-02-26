import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { parseListParams, applyListQuery } from "@/lib/crm/query-builder";
import { ensureDealStages } from "@/lib/crm/helpers";
import { createDealSchema } from "@/lib/crm/validation";
import { logAudit } from "@/lib/crm/audit";
import { runAutomations } from "@/lib/crm/automation-engine";
import { logger } from "@/lib/logger";

export const GET = withApiHandler(
  {
    permission: { resource: "deals", action: "read" },
    logTag: "Deals",
  },
  async (request, ctx) => {
    const url = new URL(request.url);
    const params = parseListParams(url);
    const supabase = createSupabaseAdmin();
    await ensureDealStages(ctx.accountId, ctx.workspaceId);

    let query = supabase
      .from("deals")
      .select("*, deal_stages(id, name, color, position, is_won, is_lost), contacts(id, first_name, last_name), companies(id, name)", { count: "exact" })
      .eq("team_id", ctx.workspaceId)
      .eq("is_deleted", false);

    query = applyListQuery(query, "deals", params, ["title"]);

    const { data, error: dbError, count } = await query;

    if (dbError) throw new ApiError("Database operation failed", 500);

    return NextResponse.json({ success: true, data, total: count });
  }
);

export const POST = withApiHandler(
  {
    permission: { resource: "deals", action: "create" },
    featureLimit: "deals",
    bodySchema: createDealSchema,
    logTag: "Deals",
  },
  async (_request, ctx, { body }) => {
    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("deals")
      .insert({ account_id: ctx.accountId, team_id: ctx.workspaceId, ...body })
      .select("*, deal_stages(id, name, color), contacts(id, first_name, last_name), companies(id, name)")
      .single();

    if (dbError) throw new ApiError("Database operation failed", 500);

    try {
      await supabase.from("crm_activities").insert({
        account_id: ctx.accountId,
        team_id: ctx.workspaceId,
        deal_id: data.id,
        contact_id: data.contact_id,
        company_id: data.company_id,
        type: "deal_created",
        title: `Deal created: ${data.title}`,
        metadata: { value: data.value },
      });
    } catch (e) { logger.error("Deals", "Failed to log activity", e); }

    logAudit({
      teamId: ctx.workspaceId,
      accountId: ctx.accountId,
      entityType: "deal",
      entityId: data.id,
      action: "create",
    });

    runAutomations({
      teamId: ctx.workspaceId,
      accountId: ctx.accountId,
      triggerType: "record_created",
      entityType: "deal",
      entityId: data.id,
      record: data,
    });

    return NextResponse.json({ success: true, data });
  }
);
