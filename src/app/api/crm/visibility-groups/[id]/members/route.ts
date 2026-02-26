import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { z } from "zod";

const addMemberSchema = z.object({
  account_id: z.string().uuid(),
});

export const GET = withApiHandler(
  {
    permission: { resource: "team_settings", action: "read" },
    logTag: "VGMembers",
  },
  async (_request, ctx, { routeParams }) => {
    const { id } = routeParams;
    const supabase = createSupabaseAdmin();

    // Verify group belongs to current team
    const { data: group } = await supabase
      .from("visibility_groups")
      .select("id")
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .single();
    if (!group) {
      return NextResponse.json({ success: false, error: "Group not found" }, { status: 404 });
    }

    const { data, error: dbError } = await supabase
      .from("visibility_group_members")
      .select("id, account_id, created_at")
      .eq("group_id", id);

    if (dbError) throw new ApiError("Failed to fetch members", 500);

    return NextResponse.json({ success: true, data: data || [] });
  }
);

export const POST = withApiHandler(
  {
    permission: { resource: "team_settings", action: "manage" },
    bodySchema: addMemberSchema,
    logTag: "VGMembers",
  },
  async (_request, ctx, { body, routeParams }) => {
    const { id } = routeParams;
    const supabase = createSupabaseAdmin();

    // Verify group belongs to current team
    const { data: group } = await supabase
      .from("visibility_groups")
      .select("id")
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .single();
    if (!group) {
      return NextResponse.json({ success: false, error: "Group not found" }, { status: 404 });
    }

    const { data, error: dbError } = await supabase
      .from("visibility_group_members")
      .insert({ group_id: id, account_id: body.account_id })
      .select()
      .single();

    if (dbError) {
      if (dbError.code === "23505") {
        return NextResponse.json({ success: false, error: "Member already in group" }, { status: 409 });
      }
      throw new ApiError("Failed to add member", 500);
    }

    return NextResponse.json({ success: true, data });
  }
);

export const DELETE = withApiHandler(
  {
    permission: { resource: "team_settings", action: "manage" },
    logTag: "VGMembers",
  },
  async (request, ctx, { routeParams }) => {
    const { id } = routeParams;
    const url = new URL(request.url);
    const accountId = url.searchParams.get("account_id");
    if (!accountId) {
      return NextResponse.json({ success: false, error: "account_id is required" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    // Verify group belongs to current team
    const { data: group } = await supabase
      .from("visibility_groups")
      .select("id")
      .eq("id", id)
      .eq("team_id", ctx.workspaceId)
      .single();
    if (!group) {
      return NextResponse.json({ success: false, error: "Group not found" }, { status: 404 });
    }

    const { error: dbError } = await supabase
      .from("visibility_group_members")
      .delete()
      .eq("group_id", id)
      .eq("account_id", accountId);

    if (dbError) throw new ApiError("Failed to remove member", 500);

    return NextResponse.json({ success: true });
  }
);
