import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { isValidUUID } from "@/lib/crm/helpers";

export const GET = withApiHandler(
  { logTag: "TeamMembers" },
  async (_request, ctx, { routeParams }) => {
    const { id } = routeParams;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }
    if (ctx.workspaceId !== id) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    const supabase = createSupabaseAdmin();
    const { data: members, error: dbError } = await supabase
      .from("team_members")
      .select("*, team_roles(*), accounts(id, clerk_user_id, name, email)")
      .eq("team_id", id)
      .neq("status", "suspended")
      .order("is_director", { ascending: false })
      .order("joined_at", { ascending: true });

    if (dbError) throw new ApiError(dbError.message, 500);

    return NextResponse.json({ success: true, data: members });
  }
);
