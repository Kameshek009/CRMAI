import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { updateTaskSchema } from "@/lib/crm/validation";
import { isValidUUID } from "@/lib/crm/helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "tasks", "read", context.isDirector);
    if (permError) return permError;

    const { id } = await params;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }
    const supabase = createSupabaseAdmin();

    const { data, error: dbError } = await supabase
      .from("crm_tasks")
      .select("*")
      .eq("id", id)
      .eq("team_id", context.teamId)
      .eq("is_deleted", false)
      .single();

    if (dbError || !data) {
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[API crm/tasks/[id] GET]", error);
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

    const permError = requirePermission(context.permissions, "tasks", "update", context.isDirector);
    if (permError) return permError;

    const { id } = await params;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }
    const body = await request.json();
    const parsed = updateTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    // If status changing to done, set completed_at
    const updateData = { ...parsed.data } as Record<string, unknown>;
    if (parsed.data.status === "done") {
      updateData.completed_at = new Date().toISOString();
    }

    const { data, error: dbError } = await supabase
      .from("crm_tasks")
      .update(updateData)
      .eq("id", id)
      .eq("team_id", context.teamId)
      .select()
      .single();

    if (dbError || !data) {
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
    }

    // Log activity
    try {
      if (parsed.data.status === "done") {
        await supabase.from("crm_activities").insert({
          account_id: context.accountId,
          team_id: context.teamId,
          contact_id: data.contact_id,
          deal_id: data.deal_id,
          type: "task_completed",
          title: `Task completed: ${data.title}`,
        });
      } else {
        await supabase.from("crm_activities").insert({
          account_id: context.accountId,
          team_id: context.teamId,
          contact_id: data.contact_id,
          deal_id: data.deal_id,
          type: "task_updated",
          title: `Task updated: ${data.title}`,
        });
      }
    } catch { /* activity logging is non-critical */ }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[API crm/tasks/[id] PATCH]", error);
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

    const permError = requirePermission(context.permissions, "tasks", "delete", context.isDirector);
    if (permError) return permError;

    const { id } = await params;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }
    const supabase = createSupabaseAdmin();

    const { data: existing } = await supabase
      .from("crm_tasks")
      .select("title, contact_id, deal_id")
      .eq("id", id)
      .eq("team_id", context.teamId)
      .single();

    const { error: dbError } = await supabase
      .from("crm_tasks")
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
        type: "task_deleted",
        title: `Task deleted: ${existing?.title || "Unknown"}`,
      });
    } catch { /* activity logging is non-critical */ }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API crm/tasks/[id] DELETE]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
