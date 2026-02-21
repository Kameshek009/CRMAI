import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { parseListParams, applyListQuery } from "@/lib/crm/query-builder";
import { logAudit } from "@/lib/crm/audit";
import { z } from "zod";
import { logger } from "@/lib/logger";

const createLeadSchema = z.object({
  first_name: z.string().min(1).max(100),
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
});

export async function GET(request: NextRequest) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "leads", "read", context.isDirector);
    if (permError) return permError;

    const url = new URL(request.url);
    const params = parseListParams(url);

    const supabase = createSupabaseAdmin();

    let query = supabase
      .from("leads")
      .select("*", { count: "exact" })
      .eq("team_id", context.workspaceId)
      .eq("is_deleted", false);

    query = applyListQuery(query, "leads", params, ["first_name", "last_name", "email", "organization"]);

    const { data, error: dbError, count } = await query;

    if (dbError) {
      logger.error("Leads", "Failed to fetch leads", dbError);
      return NextResponse.json({ success: false, error: "Failed to fetch leads" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data, total: count });
  } catch (err) {
    logger.error("Leads", "GET error", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "leads", "create", context.isDirector);
    if (permError) return permError;

    const body = await request.json();
    const parsed = createLeadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("leads")
      .insert({
        account_id: context.accountId,
        team_id: context.workspaceId,
        lead_owner_account_id: context.accountId,
        ...parsed.data,
        email: parsed.data.email || null,
      })
      .select("*")
      .single();

    if (dbError) {
      logger.error("Leads", "Failed to create lead", dbError);
      return NextResponse.json({ success: false, error: "Failed to create lead" }, { status: 500 });
    }

    logAudit({
      teamId: context.workspaceId,
      accountId: context.accountId,
      entityType: "lead",
      entityId: data.id,
      action: "create",
    });

    return NextResponse.json({ success: true, data });
  } catch (err) {
    logger.error("Leads", "POST error", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
