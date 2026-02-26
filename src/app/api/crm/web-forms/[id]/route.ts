import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { logAudit } from "@/lib/crm/audit";
import { z } from "zod";

const updateFormSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  fields: z.array(z.object({
    name: z.string().min(1),
    label: z.string().min(1),
    type: z.enum(["text", "email", "phone", "textarea", "select"]),
    required: z.boolean().optional(),
    options: z.array(z.string()).optional(),
  })).optional(),
  success_message: z.string().max(1000).optional(),
  redirect_url: z.string().url().max(2000).optional().nullable().or(z.literal("")),
  notify_emails: z.array(z.string().email()).max(10).optional(),
  primary_color: z.string().max(20).optional(),
  is_active: z.boolean().optional(),
});

export const GET = withApiHandler(
  {
    permission: { resource: "leads", action: "read" },
    logTag: "WebForms",
  },
  async (_request, ctx, { routeParams }) => {
    const { id } = routeParams;
    const supabase = createSupabaseAdmin();

    const { data, error: dbError } = await supabase
      .from("web_forms")
      .select("*")
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .eq("is_deleted", false)
      .single();

    if (dbError || !data) {
      return NextResponse.json({ success: false, error: "Form not found" }, { status: 404 });
    }

    // Also get submissions count
    const { count } = await supabase
      .from("web_form_submissions")
      .select("id", { count: "exact", head: true })
      .eq("form_id", id);

    return NextResponse.json({ success: true, data: { ...data, submissions_count: count || 0 } });
  }
);

export const PATCH = withApiHandler(
  {
    permission: { resource: "leads", action: "create" },
    bodySchema: updateFormSchema,
    logTag: "WebForms",
  },
  async (_request, ctx, { body, routeParams }) => {
    const { id } = routeParams;
    const supabase = createSupabaseAdmin();

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.fields !== undefined) updates.fields = body.fields;
    if (body.success_message !== undefined) updates.success_message = body.success_message;
    if (body.redirect_url !== undefined) updates.redirect_url = body.redirect_url || null;
    if (body.notify_emails !== undefined) updates.notify_emails = body.notify_emails;
    if (body.primary_color !== undefined) updates.primary_color = body.primary_color;
    if (body.is_active !== undefined) updates.is_active = body.is_active;

    const { data, error: dbError } = await supabase
      .from("web_forms")
      .update(updates)
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .eq("is_deleted", false)
      .select("*")
      .single();

    if (dbError || !data) {
      return NextResponse.json({ success: false, error: "Form not found" }, { status: 404 });
    }

    logAudit({
      teamId: ctx.workspaceId,
      accountId: ctx.accountId,
      entityType: "web_form",
      entityId: data.id,
      action: "update",
    });

    return NextResponse.json({ success: true, data });
  }
);

export const DELETE = withApiHandler(
  {
    permission: { resource: "leads", action: "delete" },
    logTag: "WebForms",
  },
  async (_request, ctx, { routeParams }) => {
    const { id } = routeParams;
    const supabase = createSupabaseAdmin();

    const { error: dbError } = await supabase
      .from("web_forms")
      .update({ is_deleted: true })
      .eq("id", id)
      .eq("team_id", ctx.workspaceId);

    if (dbError) throw new ApiError("Failed to delete form", 500);

    logAudit({
      teamId: ctx.workspaceId,
      accountId: ctx.accountId,
      entityType: "web_form",
      entityId: id,
      action: "delete",
    });

    return NextResponse.json({ success: true });
  }
);
