import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { z } from "zod";
import { logger } from "@/lib/logger";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  subject: z.string().max(500).optional(),
  body: z.string().max(10000).optional(),
  category: z.string().max(100).optional().nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "contacts", "update", context.isDirector);
    if (permError) return permError;

    const { id } = await params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("email_templates")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("team_id", context.teamId)
      .select()
      .single();

    if (dbError) {
      logger.error("EmailTemplates", "PATCH error", dbError);
      return NextResponse.json({ success: false, error: "Failed to update template" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    logger.error("EmailTemplates", "PATCH error", err);
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

    const permError = requirePermission(context.permissions, "contacts", "delete", context.isDirector);
    if (permError) return permError;

    const { id } = await params;
    const supabase = createSupabaseAdmin();
    const { error: dbError } = await supabase
      .from("email_templates")
      .delete()
      .eq("id", id)
      .eq("team_id", context.teamId);

    if (dbError) {
      logger.error("EmailTemplates", "DELETE error", dbError);
      return NextResponse.json({ success: false, error: "Failed to delete template" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("EmailTemplates", "DELETE error", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
