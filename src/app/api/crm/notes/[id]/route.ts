import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { updateNoteSchema } from "@/lib/crm/validation";
import { isValidUUID } from "@/lib/crm/helpers";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "contacts", "update");
    if (permError) return permError;

    const { id } = await params;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }
    const body = await request.json();
    const parsed = updateNoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("crm_notes")
      .update(parsed.data)
      .eq("id", id)
      .eq("team_id", context.teamId)
      .select()
      .single();

    if (dbError || !data) {
      return NextResponse.json({ success: false, error: "Note not found" }, { status: 404 });
    }

    try {
      await supabase.from("crm_activities").insert({
        account_id: context.accountId,
        team_id: context.teamId,
        contact_id: data.contact_id,
        deal_id: data.deal_id,
        company_id: data.company_id,
        type: "note_updated",
        title: "Note updated",
      });
    } catch { /* activity logging is non-critical */ }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[API crm/notes/[id] PATCH]", error);
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

    const permError = requirePermission(context.permissions, "contacts", "delete");
    if (permError) return permError;

    const { id } = await params;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }
    const supabase = createSupabaseAdmin();

    const { data: existing } = await supabase
      .from("crm_notes")
      .select("contact_id, deal_id, company_id")
      .eq("id", id)
      .eq("team_id", context.teamId)
      .single();

    const { error: dbError } = await supabase
      .from("crm_notes")
      .update({ is_deleted: true })
      .eq("id", id)
      .eq("team_id", context.teamId);

    if (dbError) {
      return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
    }

    try {
      await supabase.from("crm_activities").insert({
        account_id: context.accountId,
        team_id: context.teamId,
        contact_id: existing?.contact_id,
        deal_id: existing?.deal_id,
        company_id: existing?.company_id,
        type: "note_deleted",
        title: "Note deleted",
      });
    } catch { /* activity logging is non-critical */ }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API crm/notes/[id] DELETE]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
