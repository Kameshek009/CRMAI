import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext } from "@/lib/crm/team-helpers";
import { z } from "zod";
import { logger } from "@/lib/logger";

const createLayoutSchema = z.object({
  name: z.string().min(1).max(100),
  widgets: z.array(z.object({
    i: z.string(),
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
    type: z.string(),
    config: z.record(z.string(), z.unknown()).optional(),
  })),
  is_default: z.boolean().optional(),
});

export async function GET() {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("dashboard_layouts")
      .select("*")
      .eq("team_id", context.workspaceId)
      .eq("account_id", context.accountId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (dbError) {
      logger.error("DashboardLayouts", "Failed to fetch", dbError);
      return NextResponse.json({ success: false, error: "Failed to fetch layouts" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    logger.error("DashboardLayouts", "GET error", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const body = await request.json();
    const parsed = createLayoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    // If setting as default, unset other defaults
    if (parsed.data.is_default) {
      await supabase
        .from("dashboard_layouts")
        .update({ is_default: false })
        .eq("team_id", context.workspaceId)
        .eq("account_id", context.accountId);
    }

    const { data, error: dbError } = await supabase
      .from("dashboard_layouts")
      .insert({
        team_id: context.workspaceId,
        account_id: context.accountId,
        name: parsed.data.name,
        widgets: parsed.data.widgets,
        is_default: parsed.data.is_default ?? true,
      })
      .select("*")
      .single();

    if (dbError) {
      logger.error("DashboardLayouts", "Failed to create", dbError);
      return NextResponse.json({ success: false, error: "Failed to create layout" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    logger.error("DashboardLayouts", "POST error", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
