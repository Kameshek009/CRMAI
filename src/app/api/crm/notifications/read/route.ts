import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { z } from "zod";

const markReadSchema = z.object({
  ids: z.array(z.string().uuid()).optional(),
});

export const PATCH = withApiHandler(
  {
    bodySchema: markReadSchema,
    logTag: "Notifications",
  },
  async (_request, ctx, { body }) => {
    const supabase = createSupabaseAdmin();

    let query = supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("account_id", ctx.accountId)
      .eq("team_id", ctx.workspaceId);

    if (body.ids && body.ids.length > 0) {
      query = query.in("id", body.ids);
    }

    const { error: dbError } = await query;

    if (dbError) throw new ApiError("Failed to mark as read", 500);

    return NextResponse.json({ success: true });
  }
);
