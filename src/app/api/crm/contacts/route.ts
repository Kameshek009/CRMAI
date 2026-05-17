import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { parseListParams, applyListQuery } from "@/lib/crm/query-builder";
import { createContactSchema } from "@/lib/crm/validation";
import { logAudit } from "@/lib/crm/audit";
import { runAutomations } from "@/lib/crm/automation-engine";
import { logger } from "@/lib/logger";

export const GET = withApiHandler(
  {
    permission: { resource: "contacts", action: "read" },
    bearerScopes: ["contacts:read"],
    logTag: "Contacts",
  },
  async (request, ctx) => {
    const url = new URL(request.url);
    const params = parseListParams(url);
    const supabase = createSupabaseAdmin();

    let query = supabase
      .from("contacts")
      .select("*, companies(id, name)", { count: "exact" })
      .eq("team_id", ctx.workspaceId)
      .eq("is_deleted", false);

    query = applyListQuery(query, "contacts", params, ["first_name", "last_name", "email"]);

    const { data, error: dbError, count } = await query;

    if (dbError) throw new ApiError("Failed to fetch contacts", 500);

    return NextResponse.json({ success: true, data, total: count });
  }
);

export const POST = withApiHandler(
  {
    permission: { resource: "contacts", action: "create" },
    bearerScopes: ["contacts:create"],
    featureLimit: "contacts",
    bodySchema: createContactSchema,
    logTag: "Contacts",
  },
  async (_request, ctx, { body }) => {
    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("contacts")
      .insert({ account_id: ctx.accountId, team_id: ctx.workspaceId, ...body })
      .select("*, companies(id, name)")
      .single();

    if (dbError) throw new ApiError("Failed to create contact", 500);

    // Log activity
    try {
      await supabase.from("crm_activities").insert({
        account_id: ctx.accountId,
        team_id: ctx.workspaceId,
        contact_id: data.id,
        company_id: data.company_id,
        type: "contact_created",
        title: `Contact created: ${data.first_name} ${data.last_name || ""}`.trim(),
      });
    } catch (e) { logger.error("Contacts", "Failed to log activity", e); }

    logAudit({
      teamId: ctx.workspaceId,
      accountId: ctx.accountId,
      entityType: "contact",
      entityId: data.id,
      action: "create",
    });

    runAutomations({
      teamId: ctx.workspaceId,
      accountId: ctx.accountId,
      triggerType: "record_created",
      entityType: "contact",
      entityId: data.id,
      record: data,
    });

    return NextResponse.json({ success: true, data });
  }
);
