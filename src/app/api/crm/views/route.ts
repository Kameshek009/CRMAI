import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { createSavedViewSchema } from "@/lib/crm/validation";

export const GET = withApiHandler(
  { logTag: "Views" },
  async (request, ctx) => {
    const url = new URL(request.url);
    const entityType = url.searchParams.get("entity_type");

    const supabase = createSupabaseAdmin();

    let query = supabase
      .from("saved_views")
      .select("*")
      .eq("team_id", ctx.workspaceId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: false });

    if (entityType) query = query.eq("entity_type", entityType);

    // Show public views + own views
    query = query.or(`is_public.eq.true,created_by_account_id.eq.${ctx.accountId}`);

    const { data, error: dbError } = await query;

    if (dbError) throw new ApiError("Failed to fetch views", 500);

    return NextResponse.json({ success: true, data });
  }
);

export const POST = withApiHandler(
  {
    bodySchema: createSavedViewSchema,
    logTag: "Views",
  },
  async (_request, ctx, { body }) => {
    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("saved_views")
      .insert({
        team_id: ctx.workspaceId,
        created_by_account_id: ctx.accountId,
        ...body,
      })
      .select()
      .single();

    if (dbError) throw new ApiError("Failed to create view", 500);

    return NextResponse.json({ success: true, data });
  }
);
