import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";

export const GET = withApiHandler(
  { logTag: "Notifications" },
  async (_request, ctx) => {
    const supabase = createSupabaseAdmin();

    const { data, error: dbError } = await supabase
      .from("notifications")
      .select("id,type,title,message,entity_type,entity_id,is_read,created_at")
      .eq("account_id", ctx.accountId)
      .eq("team_id", ctx.workspaceId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (dbError) throw new ApiError("Failed to fetch notifications", 500);

    const unreadCount = (data || []).filter((n) => !n.is_read).length;

    return NextResponse.json({ success: true, data: data || [], unread_count: unreadCount });
  }
);
