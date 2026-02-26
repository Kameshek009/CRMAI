import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  subject: z.string().max(500).optional(),
  body: z.string().max(10000).optional(),
  category: z.string().max(100).optional().nullable(),
});

export const PATCH = withApiHandler(
  {
    permission: { resource: "contacts", action: "update" },
    bodySchema: updateSchema,
    logTag: "EmailTemplates",
  },
  async (_request, ctx, { body, routeParams }) => {
    const { id } = routeParams;
    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("email_templates")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .select()
      .single();

    if (dbError) throw new ApiError("Failed to update template", 500);

    return NextResponse.json({ success: true, data });
  }
);

export const DELETE = withApiHandler(
  {
    permission: { resource: "contacts", action: "delete" },
    logTag: "EmailTemplates",
  },
  async (_request, ctx, { routeParams }) => {
    const { id } = routeParams;
    const supabase = createSupabaseAdmin();
    const { error: dbError } = await supabase
      .from("email_templates")
      .delete()
      .eq("id", id)
      .eq("team_id", ctx.workspaceId);

    if (dbError) throw new ApiError("Failed to delete template", 500);

    return NextResponse.json({ success: true });
  }
);
