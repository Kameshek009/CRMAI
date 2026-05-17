import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { updateCompanySchema } from "@/lib/crm/validation";
import { isValidUUID } from "@/lib/crm/helpers";
import { logAudit, computeChanges } from "@/lib/crm/audit";
import { logger } from "@/lib/logger";
import { enqueueOrLog } from "@/lib/outbox/enqueue";

export const GET = withApiHandler(
  {
    permission: { resource: "companies", action: "read" },
    logTag: "Companies",
  },
  async (_request, ctx, { routeParams }) => {
    const { id } = routeParams;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }
    const supabase = createSupabaseAdmin();

    const [companyResult, contactCountResult, dealCountResult] = await Promise.all([
      supabase
        .from("companies")
        .select("*")
        .eq("id", id)
        .eq("team_id", ctx.workspaceId)
        .eq("is_deleted", false)
        .single(),
      supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("company_id", id)
        .eq("team_id", ctx.workspaceId)
        .eq("is_deleted", false),
      supabase
        .from("deals")
        .select("id", { count: "exact", head: true })
        .eq("company_id", id)
        .eq("team_id", ctx.workspaceId)
        .eq("is_deleted", false),
    ]);

    if (companyResult.error || !companyResult.data) {
      return NextResponse.json({ success: false, error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...companyResult.data,
        contact_count: contactCountResult.count || 0,
        deal_count: dealCountResult.count || 0,
      },
    });
  }
);

export const PATCH = withApiHandler(
  {
    permission: { resource: "companies", action: "update" },
    bodySchema: updateCompanySchema,
    logTag: "Companies",
  },
  async (_request, ctx, { body, routeParams }) => {
    const { id } = routeParams;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    const { data: oldRecord } = await supabase
      .from("companies")
      .select("*")
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .single();

    const { data, error: dbError } = await supabase
      .from("companies")
      .update(body)
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .select()
      .single();

    if (dbError || !data) {
      return NextResponse.json({ success: false, error: "Company not found" }, { status: 404 });
    }

    try {
      await supabase.from("crm_activities").insert({
        account_id: ctx.accountId,
        team_id: ctx.workspaceId,
        company_id: id,
        type: "company_updated",
        title: `Company updated: ${data.name}`,
      });
    } catch (e) { logger.error("Companies", "Failed to log activity", e); }

    const changes = oldRecord ? computeChanges(oldRecord, body) : undefined;
    logAudit({
      teamId: ctx.workspaceId,
      accountId: ctx.accountId,
      entityType: "company",
      entityId: id,
      action: "update",
      changes,
    });

    await enqueueOrLog(supabase, {
      teamId: ctx.workspaceId,
      eventType: "company.updated",
      entityType: "company",
      entityId: id,
      payload: { ...data, changes, actor_account_id: ctx.accountId },
    });

    return NextResponse.json({ success: true, data });
  }
);

export const DELETE = withApiHandler(
  {
    permission: { resource: "companies", action: "delete" },
    logTag: "Companies",
  },
  async (_request, ctx, { routeParams }) => {
    const { id } = routeParams;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }
    const supabase = createSupabaseAdmin();

    const { data: existing } = await supabase
      .from("companies")
      .select("name")
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .single();

    const { error: dbError } = await supabase
      .from("companies")
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: ctx.accountId })
      .eq("id", id)
      .eq("team_id", ctx.workspaceId);

    if (dbError) throw new ApiError("Database operation failed", 500);

    try {
      await supabase.from("crm_activities").insert({
        account_id: ctx.accountId,
        team_id: ctx.workspaceId,
        company_id: id,
        type: "company_deleted",
        title: `Company deleted: ${existing?.name || "Unknown"}`,
      });
    } catch (e) { logger.error("Companies", "Failed to log activity", e); }

    logAudit({
      teamId: ctx.workspaceId,
      accountId: ctx.accountId,
      entityType: "company",
      entityId: id,
      action: "delete",
    });

    await enqueueOrLog(supabase, {
      teamId: ctx.workspaceId,
      eventType: "company.trashed",
      entityType: "company",
      entityId: id,
      payload: {
        id,
        team_id: ctx.workspaceId,
        name: existing?.name ?? null,
        deleted_at: new Date().toISOString(),
        actor_account_id: ctx.accountId,
      },
    });

    return NextResponse.json({ success: true });
  }
);
