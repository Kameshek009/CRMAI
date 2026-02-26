import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { logAudit } from "@/lib/crm/audit";
import { z } from "zod";

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

export const GET = withApiHandler(
  {
    permission: { resource: "leads", action: "read" },
    logTag: "WebForms",
  },
  async (_request, ctx) => {
    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("web_forms")
      .select("*")
      .eq("team_id", ctx.workspaceId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    if (dbError) throw new ApiError("Failed to fetch forms", 500);

    return NextResponse.json({ success: true, data });
  }
);

export const POST = withApiHandler(
  {
    permission: { resource: "leads", action: "create" },
    bodySchema: createFormSchema,
    logTag: "WebForms",
  },
  async (_request, ctx, { body }) => {
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
        team_id: ctx.workspaceId,
        account_id: ctx.accountId,
        slug,
        name: body.name,
        description: body.description || null,
        fields: body.fields || [],
        success_message: body.success_message || "Thank you!",
        redirect_url: body.redirect_url || null,
        notify_emails: body.notify_emails || [],
        primary_color: body.primary_color || "#3b82f6",
        is_active: body.is_active ?? true,
      })
      .select("*")
      .single();

    if (dbError) throw new ApiError("Failed to create form", 500);

    logAudit({
      teamId: ctx.workspaceId,
      accountId: ctx.accountId,
      entityType: "web_form",
      entityId: data.id,
      action: "create",
    });

    return NextResponse.json({ success: true, data });
  }
);
