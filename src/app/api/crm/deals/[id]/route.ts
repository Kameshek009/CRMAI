import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { updateDealSchema } from "@/lib/crm/validation";
import { isValidUUID } from "@/lib/crm/helpers";
import { logger } from "@/lib/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "deals", "read", context.isDirector);
    if (permError) return permError;

    const { id } = await params;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }
    const supabase = createSupabaseAdmin();

    const { data, error: dbError } = await supabase
      .from("deals")
      .select("*, deal_stages(id, name, color, position, is_won, is_lost), contacts(id, first_name, last_name, email), companies(id, name)")
      .eq("id", id)
      .eq("team_id", context.teamId)
      .eq("is_deleted", false)
      .single();

    if (dbError || !data) {
      return NextResponse.json({ success: false, error: "Deal not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("Deals", "GET error", error);
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

    const permError = requirePermission(context.permissions, "deals", "update", context.isDirector);
    if (permError) return permError;

    const { id } = await params;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }
    const body = await request.json();
    const parsed = updateDealSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("deals")
      .update(parsed.data)
      .eq("id", id)
      .eq("team_id", context.teamId)
      .select("*, deal_stages(id, name, color), contacts(id, first_name, last_name), companies(id, name)")
      .single();

    if (dbError || !data) {
      return NextResponse.json({ success: false, error: "Deal not found" }, { status: 404 });
    }

    try {
      await supabase.from("crm_activities").insert({
        account_id: context.accountId,
        team_id: context.teamId,
        deal_id: id,
        contact_id: data.contact_id,
        company_id: data.company_id,
        type: "deal_updated",
        title: `Deal updated: ${data.title}`,
      });
    } catch (e) { logger.warn("Deals", "Failed to log activity", e); }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("Deals", "PATCH error", error);
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

    const permError = requirePermission(context.permissions, "deals", "delete", context.isDirector);
    if (permError) return permError;

    const { id } = await params;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }
    const supabase = createSupabaseAdmin();

    const { data: existing } = await supabase
      .from("deals")
      .select("title, contact_id, company_id")
      .eq("id", id)
      .eq("team_id", context.teamId)
      .single();

    const { error: dbError } = await supabase
      .from("deals")
      .update({ is_deleted: true })
      .eq("id", id)
      .eq("team_id", context.teamId);

    if (dbError) {
      logger.error("Deals", "DB error", dbError);
      return NextResponse.json({ success: false, error: "Database operation failed" }, { status: 500 });
    }

    try {
      await supabase.from("crm_activities").insert({
        account_id: context.accountId,
        team_id: context.teamId,
        deal_id: id,
        contact_id: existing?.contact_id,
        company_id: existing?.company_id,
        type: "deal_deleted",
        title: `Deal deleted: ${existing?.title || "Unknown"}`,
      });
    } catch (e) { logger.warn("Deals", "Failed to log activity", e); }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Deals", "DELETE error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
