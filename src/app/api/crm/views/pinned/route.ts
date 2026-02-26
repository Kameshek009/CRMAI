import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import type { SavedViewRow } from "@/types/crm";
import { transformSavedViewRow } from "@/types/crm";

export const GET = withApiHandler(
  { logTag: "Views/Pinned" },
  async (_request, ctx) => {
    const supabase = createSupabaseAdmin();

    const { data, error: dbError } = await supabase
      .from("saved_views")
      .select("*")
      .eq("team_id", ctx.workspaceId)
      .eq("is_pinned", true)
      .order("position", { ascending: true })
      .order("created_at", { ascending: false });

    if (dbError) throw new ApiError("Failed to fetch pinned views", 500);

    const views = (data as SavedViewRow[]).map(transformSavedViewRow);

    return NextResponse.json({ success: true, data: views });
  }
);
