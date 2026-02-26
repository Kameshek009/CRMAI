import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { parseListParams, applyListQuery } from "@/lib/crm/query-builder";
import { logAudit } from "@/lib/crm/audit";
import { z } from "zod";

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

export const GET = withApiHandler(
  {
    permission: { resource: "leads", action: "read" },
    logTag: "Leads",
  },
  async (request, ctx) => {
    const url = new URL(request.url);
    const params = parseListParams(url);
    const supabase = createSupabaseAdmin();

    let query = supabase
      .from("leads")
      .select("*", { count: "exact" })
      .eq("team_id", ctx.workspaceId)
      .eq("is_deleted", false);

    query = applyListQuery(query, "leads", params, ["first_name", "last_name", "email", "organization"]);

    const { data, error: dbError, count } = await query;

    if (dbError) throw new ApiError("Failed to fetch leads", 500);

    return NextResponse.json({ success: true, data, total: count });
  }
);

export const POST = withApiHandler(
  {
    permission: { resource: "leads", action: "create" },
    bodySchema: createLeadSchema,
    logTag: "Leads",
  },
  async (_request, ctx, { body }) => {
    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("leads")
      .insert({
        account_id: ctx.accountId,
        team_id: ctx.workspaceId,
        lead_owner_account_id: ctx.accountId,
        ...body,
        email: body.email || null,
      })
      .select("*")
      .single();

    if (dbError) throw new ApiError("Failed to create lead", 500);

    logAudit({
      teamId: ctx.workspaceId,
      accountId: ctx.accountId,
      entityType: "lead",
      entityId: data.id,
      action: "create",
    });

    return NextResponse.json({ success: true, data });
  }
);
