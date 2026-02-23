import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContext } from "@/lib/crm/team-helpers";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { updateGoalSchema } from "@/lib/crm/validation";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { context, error } = await getWorkspaceContext();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = updateGoalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Invalid input" }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();

  const { data, error: dbError } = await supabase
    .from("goals")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("team_id", context.workspaceId)
    .select()
    .single();

  if (dbError || !data) {
    return NextResponse.json({ success: false, error: "Failed to update goal" }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { context, error } = await getWorkspaceContext();
  if (error) return error;

  const { id } = await params;

  const supabase = createSupabaseAdmin();

  const { error: dbError } = await supabase
    .from("goals")
    .update({ is_active: false })
    .eq("id", id)
    .eq("team_id", context.workspaceId);

  if (dbError) {
    return NextResponse.json({ success: false, error: "Failed to delete goal" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
