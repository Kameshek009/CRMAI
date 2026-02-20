import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceContext } from "@/lib/crm/team-helpers";
import { createSupabaseAdmin } from "@/lib/supabase/server";

export async function PATCH(request: NextRequest) {
  const { context, error } = await getWorkspaceContext();
  if (error) return error;

  const body = await request.json();
  const { ids } = body as { ids?: string[] };

  const supabase = createSupabaseAdmin();

  let query = supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("account_id", context.accountId)
    .eq("team_id", context.workspaceId);

  if (ids && ids.length > 0) {
    query = query.in("id", ids);
  }

  const { error: dbError } = await query;

  if (dbError) {
    return NextResponse.json({ success: false, error: "Failed to mark as read" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
