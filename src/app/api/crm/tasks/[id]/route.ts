import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getAccountId } from "@/lib/crm/helpers";
import { updateTaskSchema } from "@/lib/crm/validation";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { accountId, error } = await getAccountId();
    if (error) return error;

    const { id } = await params;
    const body = await request.json();
    const parsed = updateTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input" }, { status: 400 });
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
      .eq("account_id", accountId)
      .select()
      .single();

    if (dbError || !data) {
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });
    }

    // Log activity if completed
    if (parsed.data.status === "done") {
      await supabase.from("crm_activities").insert({
        account_id: accountId,
        contact_id: data.contact_id,
        deal_id: data.deal_id,
        type: "task_completed",
        title: `Task completed: ${data.title}`,
      });
    }

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { accountId, error } = await getAccountId();
    if (error) return error;

    const { id } = await params;
    const supabase = createSupabaseAdmin();

    const { error: dbError } = await supabase
      .from("crm_tasks")
      .delete()
      .eq("id", id)
      .eq("account_id", accountId);

    if (dbError) {
      return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
