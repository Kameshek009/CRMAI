import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { z } from "zod";
import { logger } from "@/lib/logger";

const updateSequenceSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  is_active: z.boolean().optional(),
  trigger_type: z.enum(["manual", "on_create", "on_stage_change"]).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const { id } = await params;
    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("email_sequences")
      .select("*, email_sequence_steps(*)")
      .eq("id", id)
      .eq("team_id", context.workspaceId)
      .single();

    if (dbError) {
      logger.error("Sequences", "GET [id] error", dbError);
      return NextResponse.json({ success: false, error: "Sequence not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("Sequences", "GET [id] error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

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
    const body = await request.json();
    const parsed = updateSequenceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("email_sequences")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("team_id", context.workspaceId)
      .select()
      .single();

    if (dbError) {
      logger.error("Sequences", "PATCH error", dbError);
      return NextResponse.json({ success: false, error: "Failed to update sequence" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("Sequences", "PATCH error", error);
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
    const supabase = createSupabaseAdmin();
    const { error: dbError } = await supabase
      .from("email_sequences")
      .delete()
      .eq("id", id)
      .eq("team_id", context.workspaceId);

    if (dbError) {
      logger.error("Sequences", "DELETE error", dbError);
      return NextResponse.json({ success: false, error: "Failed to delete sequence" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Sequences", "DELETE error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
