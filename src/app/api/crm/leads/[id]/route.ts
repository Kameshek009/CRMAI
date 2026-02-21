import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { isValidUUID } from "@/lib/crm/helpers";
import { logAudit } from "@/lib/crm/audit";
import { z } from "zod";
import { logger } from "@/lib/logger";

const updateLeadSchema = z.object({
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().max(100).optional().nullable(),
  email: z.string().email().max(254).optional().nullable().or(z.literal("")),
  phone: z.string().max(30).optional().nullable(),
  mobile: z.string().max(30).optional().nullable(),
  organization: z.string().max(200).optional().nullable(),
  website: z.string().max(2000).optional().nullable(),
  job_title: z.string().max(200).optional().nullable(),
  source: z.string().max(100).optional().nullable(),
  status: z.enum(["new", "contacted", "qualified", "unqualified", "junk"]).optional(),
  notes: z.string().max(10000).optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  lead_owner_account_id: z.string().uuid().optional().nullable(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "leads", "read", context.isDirector);
    if (permError) return permError;

    const { id } = await params;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", id)
      .eq("team_id", context.workspaceId)
      .eq("is_deleted", false)
      .single();

    if (dbError || !data) {
      return NextResponse.json({ success: false, error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    logger.error("Leads", "GET[id] error", err);
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

    const permError = requirePermission(context.permissions, "leads", "update", context.isDirector);
    if (permError) return permError;

    const { id } = await params;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = updateLeadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("leads")
      .update(parsed.data)
      .eq("id", id)
      .eq("team_id", context.workspaceId)
      .select("*")
      .single();

    if (dbError) {
      logger.error("Leads", "PATCH error", dbError);
      return NextResponse.json({ success: false, error: "Failed to update lead" }, { status: 500 });
    }

    logAudit({
      teamId: context.workspaceId,
      accountId: context.accountId,
      entityType: "lead",
      entityId: id,
      action: "update",
    });

    return NextResponse.json({ success: true, data });
  } catch (err) {
    logger.error("Leads", "PATCH error", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "leads", "delete", context.isDirector);
    if (permError) return permError;

    const { id } = await params;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { error: dbError } = await supabase
      .from("leads")
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: context.accountId })
      .eq("id", id)
      .eq("team_id", context.workspaceId);

    if (dbError) {
      logger.error("Leads", "DELETE error", dbError);
      return NextResponse.json({ success: false, error: "Failed to delete lead" }, { status: 500 });
    }

    logAudit({
      teamId: context.workspaceId,
      accountId: context.accountId,
      entityType: "lead",
      entityId: id,
      action: "delete",
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("Leads", "DELETE error", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
