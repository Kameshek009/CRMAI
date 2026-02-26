import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { updateSavedViewSchema } from "@/lib/crm/validation";
import { isValidUUID } from "@/lib/crm/helpers";

export const GET = withApiHandler(
  { logTag: "Views" },
  async (_request, ctx, { routeParams }) => {
    const { id } = routeParams;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("saved_views")
      .select("*")
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .single();

    if (dbError || !data) {
      return NextResponse.json({ success: false, error: "View not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  }
);

export const PATCH = withApiHandler(
  {
    bodySchema: updateSavedViewSchema,
    logTag: "Views",
  },
  async (_request, ctx, { body, routeParams }) => {
    const { id } = routeParams;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("saved_views")
      .update(body)
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .select()
      .single();

    if (dbError || !data) {
      return NextResponse.json({ success: false, error: "View not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  }
);

export const DELETE = withApiHandler(
  { logTag: "Views" },
  async (_request, ctx, { routeParams }) => {
    const { id } = routeParams;
    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID format" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { error: dbError } = await supabase
      .from("saved_views")
      .delete()
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .eq("created_by_account_id", ctx.accountId);

    if (dbError) throw new ApiError("Failed to delete view", 500);

    return NextResponse.json({ success: true });
  }
);
