import { NextResponse } from "next/server";
import { getWorkspaceContext } from "@/lib/crm/team-helpers";
import { createSupabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  const { context, error } = await getWorkspaceContext();
  if (error) return error;

  const supabase = createSupabaseAdmin();

  const { data, error: dbError } = await supabase
    .from("notifications")
    .select("id,type,title,message,entity_type,entity_id,is_read,created_at")
    .eq("account_id", context.accountId)
    .eq("team_id", context.workspaceId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (dbError) {
    return NextResponse.json({ success: false, error: "Failed to fetch notifications" }, { status: 500 });
  }

  const unreadCount = (data || []).filter((n) => !n.is_read).length;

  return NextResponse.json({ success: true, data: data || [], unread_count: unreadCount });
}
