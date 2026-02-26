import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { z } from "zod";

const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  subject: z.string().max(500).default(""),
  body: z.string().max(10000),
  category: z.string().max(100).optional(),
});

export const GET = withApiHandler(
  {
    permission: { resource: "contacts", action: "read" },
    logTag: "EmailTemplates",
  },
  async (_request, ctx) => {
    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("team_id", ctx.workspaceId)
      .order("created_at", { ascending: false });

    if (dbError) throw new ApiError("Failed to fetch templates", 500);

    return NextResponse.json({ success: true, data: data || [] });
  }
);

export const POST = withApiHandler(
  {
    permission: { resource: "contacts", action: "create" },
    featureLimit: "emailTemplates",
    bodySchema: createTemplateSchema,
    logTag: "EmailTemplates",
  },
  async (_request, ctx, { body }) => {
    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("email_templates")
      .insert({
        team_id: ctx.workspaceId,
        account_id: ctx.accountId,
        ...body,
      })
      .select()
      .single();

    if (dbError) throw new ApiError("Failed to create template", 500);

    return NextResponse.json({ success: true, data });
  }
);
