import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { updateCompanySchema } from "@/lib/crm/validation";
import { isValidUUID } from "@/lib/crm/helpers";
import { logAudit, computeChanges } from "@/lib/crm/audit";
import { logger } from "@/lib/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "companies", "read", context.isOwner);
    if (permError) return permError;

    const { id } = await params;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }
    const supabase = createSupabaseAdmin();

    const [companyResult, contactCountResult, dealCountResult] = await Promise.all([
      supabase
        .from("companies")
        .select("*")
        .eq("id", id)
        .eq("team_id", context.workspaceId)
        .eq("is_deleted", false)
        .single(),
      supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("company_id", id)
        .eq("team_id", context.workspaceId)
        .eq("is_deleted", false),
      supabase
        .from("deals")
        .select("id", { count: "exact", head: true })
        .eq("company_id", id)
        .eq("team_id", context.workspaceId)
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
  } catch (error) {
    logger.error("Companies", "GET error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "companies", "update", context.isOwner);
    if (permError) return permError;

    const { id } = await params;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }
    const body = await request.json();
    const parsed = updateCompanySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    // Fetch old record for audit diff
    const { data: oldRecord } = await supabase
      .from("companies")
      .select("*")
      .eq("id", id)
      .eq("team_id", context.workspaceId)
      .single();

    const { data, error: dbError } = await supabase
      .from("companies")
      .update(parsed.data)
      .eq("id", id)
      .eq("team_id", context.workspaceId)
      .select()
      .single();

    if (dbError || !data) {
      return NextResponse.json({ success: false, error: "Company not found" }, { status: 404 });
    }

    try {
      await supabase.from("crm_activities").insert({
        account_id: context.accountId,
        team_id: context.workspaceId,
        company_id: id,
        type: "company_updated",
        title: `Company updated: ${data.name}`,
      });
    } catch (e) { logger.warn("Companies", "Failed to log activity", e); }

    logAudit({
      teamId: context.workspaceId,
      accountId: context.accountId,
      entityType: "company",
      entityId: id,
      action: "update",
      changes: oldRecord ? computeChanges(oldRecord, parsed.data) : undefined,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("Companies", "PATCH error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "companies", "delete", context.isOwner);
    if (permError) return permError;

    const { id } = await params;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }
    const supabase = createSupabaseAdmin();

    const { data: existing } = await supabase
      .from("companies")
      .select("name")
      .eq("id", id)
      .eq("team_id", context.workspaceId)
      .single();

    const { error: dbError } = await supabase
      .from("companies")
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: context.accountId })
      .eq("id", id)
      .eq("team_id", context.workspaceId);

    if (dbError) {
      logger.error("Companies", "DB error", dbError);
      return NextResponse.json({ success: false, error: "Database operation failed" }, { status: 500 });
    }

    try {
      await supabase.from("crm_activities").insert({
        account_id: context.accountId,
        team_id: context.workspaceId,
        company_id: id,
        type: "company_deleted",
        title: `Company deleted: ${existing?.name || "Unknown"}`,
      });
    } catch (e) { logger.warn("Companies", "Failed to log activity", e); }

    logAudit({
      teamId: context.workspaceId,
      accountId: context.accountId,
      entityType: "company",
      entityId: id,
      action: "delete",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Companies", "DELETE error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
