import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { z } from "zod";
import { logger } from "@/lib/logger";

const addMemberSchema = z.object({
  account_id: z.string().uuid(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "team_settings", "read", context.isOwner);
    if (permError) return permError;

    const { id } = await params;
    const supabase = createSupabaseAdmin();

    // Verify group belongs to current team
    const { data: group } = await supabase
      .from("visibility_groups")
      .select("id")
      .eq("id", id)
      .eq("team_id", context.workspaceId)
      .single();
    if (!group) {
      return NextResponse.json({ success: false, error: "Group not found" }, { status: 404 });
    }

    const { data, error: dbError } = await supabase
      .from("visibility_group_members")
      .select("id, account_id, created_at")
      .eq("group_id", id);

    if (dbError) {
      logger.error("VGMembers", "GET error", dbError);
      return NextResponse.json({ success: false, error: "Failed to fetch members" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    logger.error("VGMembers", "GET error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "team_settings", "manage", context.isOwner);
    if (permError) return permError;

    const { id } = await params;
    const body = await request.json();
    const parsed = addMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    // Verify group belongs to current team
    const { data: group } = await supabase
      .from("visibility_groups")
      .select("id")
      .eq("id", id)
      .eq("team_id", context.workspaceId)
      .single();
    if (!group) {
      return NextResponse.json({ success: false, error: "Group not found" }, { status: 404 });
    }

    const { data, error: dbError } = await supabase
      .from("visibility_group_members")
      .insert({ group_id: id, account_id: parsed.data.account_id })
      .select()
      .single();

    if (dbError) {
      if (dbError.code === "23505") {
        return NextResponse.json({ success: false, error: "Member already in group" }, { status: 409 });
      }
      logger.error("VGMembers", "POST error", dbError);
      return NextResponse.json({ success: false, error: "Failed to add member" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("VGMembers", "POST error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "team_settings", "manage", context.isOwner);
    if (permError) return permError;

    const { id } = await params;
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
      .eq("team_id", context.workspaceId)
      .single();
    if (!group) {
      return NextResponse.json({ success: false, error: "Group not found" }, { status: 404 });
    }

    const { error: dbError } = await supabase
      .from("visibility_group_members")
      .delete()
      .eq("group_id", id)
      .eq("account_id", accountId);

    if (dbError) {
      logger.error("VGMembers", "DELETE error", dbError);
      return NextResponse.json({ success: false, error: "Failed to remove member" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("VGMembers", "DELETE error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
