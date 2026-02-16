import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { updateContactSchema } from "@/lib/crm/validation";
import { isValidUUID } from "@/lib/crm/helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "contacts", "read");
    if (permError) return permError;

    const { id } = await params;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }
    const supabase = createSupabaseAdmin();

    const { data, error: dbError } = await supabase
      .from("contacts")
      .select("*, companies(id, name, industry, domain)")
      .eq("id", id)
      .eq("team_id", context.teamId)
      .eq("is_deleted", false)
      .single();

    if (dbError || !data) {
      return NextResponse.json({ success: false, error: "Contact not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[API crm/contacts/[id] GET]", error);
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

    const permError = requirePermission(context.permissions, "contacts", "update");
    if (permError) return permError;

    const { id } = await params;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }
    const body = await request.json();
    const parsed = updateContactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("contacts")
      .update(parsed.data)
      .eq("id", id)
      .eq("team_id", context.teamId)
      .select("*, companies(id, name)")
      .single();

    if (dbError || !data) {
      return NextResponse.json({ success: false, error: "Contact not found" }, { status: 404 });
    }

    try {
      await supabase.from("crm_activities").insert({
        account_id: context.accountId,
        team_id: context.teamId,
        contact_id: id,
        type: "contact_updated",
        title: `Contact updated: ${data.first_name} ${data.last_name || ""}`.trim(),
      });
    } catch { /* activity logging is non-critical */ }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[API crm/contacts/[id] PATCH]", error);
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
      .from("contacts")
      .select("first_name, last_name")
      .eq("id", id)
      .eq("team_id", context.teamId)
      .single();

    const { error: dbError } = await supabase
      .from("contacts")
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
        contact_id: id,
        type: "contact_deleted",
        title: `Contact deleted: ${existing?.first_name || ""} ${existing?.last_name || ""}`.trim(),
      });
    } catch { /* activity logging is non-critical */ }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API crm/contacts/[id] DELETE]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
