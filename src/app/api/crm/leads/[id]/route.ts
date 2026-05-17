import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { isValidUUID } from "@/lib/crm/helpers";
import { logAudit } from "@/lib/crm/audit";
import { enqueueOrLog } from "@/lib/outbox/enqueue";
import { z } from "zod";

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

export const GET = withApiHandler(
  {
    permission: { resource: "leads", action: "read" },
    logTag: "Leads",
  },
  async (_request, ctx, { routeParams }) => {
    const { id } = routeParams;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .eq("is_deleted", false)
      .single();

    if (dbError || !data) {
      return NextResponse.json({ success: false, error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  }
);

export const PATCH = withApiHandler(
  {
    permission: { resource: "leads", action: "update" },
    bodySchema: updateLeadSchema,
    logTag: "Leads",
  },
  async (_request, ctx, { body, routeParams }) => {
    const { id } = routeParams;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("leads")
      .update(body)
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .select("*")
      .single();

    if (dbError) throw new ApiError("Failed to update lead", 500);

    logAudit({
      teamId: ctx.workspaceId,
      accountId: ctx.accountId,
      entityType: "lead",
      entityId: id,
      action: "update",
    });

    await enqueueOrLog(supabase, {
      teamId: ctx.workspaceId,
      eventType: "lead.updated",
      entityType: "lead",
      entityId: id,
      payload: { ...data, actor_account_id: ctx.accountId },
    });

    return NextResponse.json({ success: true, data });
  }
);

export const DELETE = withApiHandler(
  {
    permission: { resource: "leads", action: "delete" },
    logTag: "Leads",
  },
  async (_request, ctx, { routeParams }) => {
    const { id } = routeParams;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data: existing } = await supabase
      .from("leads")
      .select("first_name, last_name, organization")
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .maybeSingle();

    const { error: dbError } = await supabase
      .from("leads")
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: ctx.accountId })
      .eq("id", id)
      .eq("team_id", ctx.workspaceId);

    if (dbError) throw new ApiError("Failed to delete lead", 500);

    logAudit({
      teamId: ctx.workspaceId,
      accountId: ctx.accountId,
      entityType: "lead",
      entityId: id,
      action: "delete",
    });

    await enqueueOrLog(supabase, {
      teamId: ctx.workspaceId,
      eventType: "lead.trashed",
      entityType: "lead",
      entityId: id,
      payload: {
        id,
        team_id: ctx.workspaceId,
        first_name: existing?.first_name ?? null,
        last_name: existing?.last_name ?? null,
        organization: existing?.organization ?? null,
        deleted_at: new Date().toISOString(),
        actor_account_id: ctx.accountId,
      },
    });

    return NextResponse.json({ success: true });
  }
);
