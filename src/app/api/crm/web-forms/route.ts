import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { logAudit } from "@/lib/crm/audit";
import { z } from "zod";
import { logger } from "@/lib/logger";

const createFormSchema = z.object({
  name: z.string().min(1).max(200),
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

function generateSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let slug = "";
  for (let i = 0; i < 8; i++) {
    slug += chars[Math.floor(Math.random() * chars.length)];
  }
  return slug;
}

export async function GET() {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "leads", "read", context.isDirector);
    if (permError) return permError;

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("web_forms")
      .select("*")
      .eq("team_id", context.workspaceId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    if (dbError) {
      logger.error("WebForms", "Failed to fetch forms", dbError);
      return NextResponse.json({ success: false, error: "Failed to fetch forms" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    logger.error("WebForms", "GET error", err);
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
    const parsed = createFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    // Generate unique slug
    let slug = generateSlug();
    let attempts = 0;
    while (attempts < 5) {
      const { data: existing } = await supabase
        .from("web_forms")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!existing) break;
      slug = generateSlug();
      attempts++;
    }

    const { data, error: dbError } = await supabase
      .from("web_forms")
      .insert({
        team_id: context.workspaceId,
        account_id: context.accountId,
        slug,
        name: parsed.data.name,
        description: parsed.data.description || null,
        fields: parsed.data.fields || [],
        success_message: parsed.data.success_message || "Thank you!",
        redirect_url: parsed.data.redirect_url || null,
        notify_emails: parsed.data.notify_emails || [],
        primary_color: parsed.data.primary_color || "#3b82f6",
        is_active: parsed.data.is_active ?? true,
      })
      .select("*")
      .single();

    if (dbError) {
      logger.error("WebForms", "Failed to create form", dbError);
      return NextResponse.json({ success: false, error: "Failed to create form" }, { status: 500 });
    }

    logAudit({
      teamId: context.workspaceId,
      accountId: context.accountId,
      entityType: "web_form",
      entityId: data.id,
      action: "create",
    });

    return NextResponse.json({ success: true, data });
  } catch (err) {
    logger.error("WebForms", "POST error", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
