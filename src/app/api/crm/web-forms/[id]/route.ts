import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { logAudit } from "@/lib/crm/audit";
import { z } from "zod";
import { logger } from "@/lib/logger";

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

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, ctx: RouteContext) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "leads", "read", context.isDirector);
    if (permError) return permError;

    const { id } = await ctx.params;
    const supabase = createSupabaseAdmin();

    const { data, error: dbError } = await supabase
      .from("web_forms")
      .select("*")
      .eq("id", id)
      .eq("team_id", context.workspaceId)
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
  } catch (err) {
    logger.error("WebForms", "GET [id] error", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, ctx: RouteContext) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "leads", "create", context.isDirector);
    if (permError) return permError;

    const { id } = await ctx.params;
    const body = await request.json();
    const parsed = updateFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    const updates: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.description !== undefined) updates.description = parsed.data.description;
    if (parsed.data.fields !== undefined) updates.fields = parsed.data.fields;
    if (parsed.data.success_message !== undefined) updates.success_message = parsed.data.success_message;
    if (parsed.data.redirect_url !== undefined) updates.redirect_url = parsed.data.redirect_url || null;
    if (parsed.data.notify_emails !== undefined) updates.notify_emails = parsed.data.notify_emails;
    if (parsed.data.primary_color !== undefined) updates.primary_color = parsed.data.primary_color;
    if (parsed.data.is_active !== undefined) updates.is_active = parsed.data.is_active;

    const { data, error: dbError } = await supabase
      .from("web_forms")
      .update(updates)
      .eq("id", id)
      .eq("team_id", context.workspaceId)
      .eq("is_deleted", false)
      .select("*")
      .single();

    if (dbError || !data) {
      return NextResponse.json({ success: false, error: "Form not found" }, { status: 404 });
    }

    logAudit({
      teamId: context.workspaceId,
      accountId: context.accountId,
      entityType: "web_form",
      entityId: data.id,
      action: "update",
    });

    return NextResponse.json({ success: true, data });
  } catch (err) {
    logger.error("WebForms", "PATCH error", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, ctx: RouteContext) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "leads", "delete", context.isDirector);
    if (permError) return permError;

    const { id } = await ctx.params;
    const supabase = createSupabaseAdmin();

    const { error: dbError } = await supabase
      .from("web_forms")
      .update({ is_deleted: true })
      .eq("id", id)
      .eq("team_id", context.workspaceId);

    if (dbError) {
      logger.error("WebForms", "Failed to delete form", dbError);
      return NextResponse.json({ success: false, error: "Failed to delete form" }, { status: 500 });
    }

    logAudit({
      teamId: context.workspaceId,
      accountId: context.accountId,
      entityType: "web_form",
      entityId: id,
      action: "delete",
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("WebForms", "DELETE error", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
