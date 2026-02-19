import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { isValidUUID } from "@/lib/crm/helpers";
import { z } from "zod";
import { logger } from "@/lib/logger";

const updateFieldSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  options: z.array(z.object({
    value: z.string(),
    label: z.string(),
    color: z.string().optional(),
  })).optional(),
  is_required: z.boolean().optional(),
  position: z.number().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "team_settings", "manage", context.isOwner);
    if (permError) return permError;

    const { id } = await params;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = updateFieldSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("field_definitions")
      .update(parsed.data)
      .eq("id", id)
      .eq("team_id", context.workspaceId)
      .select()
      .single();

    if (dbError || !data) {
      return NextResponse.json({ success: false, error: "Field not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("Fields", "PATCH error", error);
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

    const permError = requirePermission(context.permissions, "team_settings", "manage", context.isOwner);
    if (permError) return permError;

    const { id } = await params;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { error: dbError } = await supabase
      .from("field_definitions")
      .delete()
      .eq("id", id)
      .eq("team_id", context.workspaceId);

    if (dbError) {
      logger.error("Fields", "Failed to delete field", dbError);
      return NextResponse.json({ success: false, error: "Failed to delete field" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Fields", "DELETE error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
