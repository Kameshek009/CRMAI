import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { bulkTasksSchema } from "@/lib/crm/validation";

export async function POST(request: NextRequest) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const body = await request.json();
    const parsed = bulkTasksSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid input", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();
    const { action, ids } = parsed.data;

    if (action === "delete") {
      const permError = requirePermission(context.permissions, "tasks", "delete");
      if (permError) return permError;

      const { error: dbError } = await supabase
        .from("crm_tasks")
        .update({ is_deleted: true })
        .in("id", ids)
        .eq("account_id", context.accountId)
        .eq("team_id", context.teamId);

      if (dbError) {
        return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, deleted: ids.length });
    }

    if (action === "update_status") {
      const permError = requirePermission(context.permissions, "tasks", "update");
      if (permError) return permError;

      const { status } = parsed.data;
      const updateData: Record<string, unknown> = { status };
      if (status === "done") {
        updateData.completed_at = new Date().toISOString();
      }

      const { error: dbError } = await supabase
        .from("crm_tasks")
        .update(updateData)
        .in("id", ids)
        .eq("account_id", context.accountId)
        .eq("team_id", context.teamId);

      if (dbError) {
        return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, updated: ids.length });
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error("[API crm/tasks/bulk POST]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
