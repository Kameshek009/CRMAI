import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { updateLeadSchema } from "@/lib/crm/validation";
import { isValidUUID } from "@/lib/crm/helpers";
import { logger } from "@/lib/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "leads", "read", context.isDirector);
    if (permError) return permError;

    const { id } = await params;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", id)
      .eq("team_id", context.teamId)
      .eq("is_deleted", false)
      .single();

    if (dbError || !data) {
      return NextResponse.json({ success: false, error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("Leads", "GET error", error);
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

    const permError = requirePermission(context.permissions, "leads", "update", context.isDirector);
    if (permError) return permError;

    const { id } = await params;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = updateLeadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("leads")
      .update(parsed.data)
      .eq("id", id)
      .eq("team_id", context.teamId)
      .select()
      .single();

    if (dbError || !data) {
      return NextResponse.json({ success: false, error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("Leads", "PATCH error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "leads", "delete", context.isDirector);
    if (permError) return permError;

    const { id } = await params;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { error: dbError } = await supabase
      .from("leads")
      .update({ is_deleted: true })
      .eq("id", id)
      .eq("team_id", context.teamId);

    if (dbError) {
      logger.error("Leads", "Failed to delete lead", dbError);
      return NextResponse.json({ success: false, error: "Failed to delete lead" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Leads", "DELETE error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
