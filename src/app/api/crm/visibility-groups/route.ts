import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { requireFeatureLimit } from "@/lib/usage/feature-limits";
import { z } from "zod";
import { logger } from "@/lib/logger";

const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  is_default: z.boolean().optional(),
});

export async function GET() {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "team_settings", "read", context.isOwner);
    if (permError) return permError;

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("visibility_groups")
      .select("*, visibility_group_members(id, account_id)")
      .eq("team_id", context.workspaceId)
      .order("created_at", { ascending: true });

    if (dbError) {
      logger.error("VisibilityGroups", "GET error", dbError);
      return NextResponse.json({ success: false, error: "Failed to fetch groups" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    logger.error("VisibilityGroups", "GET error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "team_settings", "manage", context.isOwner);
    if (permError) return permError;

    const limitError = await requireFeatureLimit(context.workspaceId, context.tier, "visibilityGroups");
    if (limitError) return limitError;

    const body = await request.json();
    const parsed = createGroupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("visibility_groups")
      .insert({ team_id: context.workspaceId, ...parsed.data })
      .select()
      .single();

    if (dbError) {
      logger.error("VisibilityGroups", "POST error", dbError);
      return NextResponse.json({ success: false, error: "Failed to create group" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("VisibilityGroups", "POST error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
