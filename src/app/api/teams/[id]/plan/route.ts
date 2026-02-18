import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext } from "@/lib/crm/team-helpers";
import { logger } from "@/lib/logger";

interface PlanGoal {
  id: string;
  text: string;
  completed: boolean;
}

interface TeamPlan {
  title: string;
  goals: PlanGoal[];
  updatedAt: string;
  updatedBy: string;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const { id } = await params;
    if (context.teamId !== id) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    const supabase = createSupabaseAdmin();
    const { data: team, error: dbError } = await supabase
      .from("teams")
      .select("settings")
      .eq("id", id)
      .single();

    if (dbError) {
      return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
    }

    const settings = (team?.settings || {}) as Record<string, unknown>;
    const plan = (settings.plan as TeamPlan) || null;

    return NextResponse.json({ success: true, data: plan });
  } catch (err) {
    logger.error("TeamPlanGET", "Failed to fetch plan", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const { id } = await params;
    if (context.teamId !== id) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    if (!context.isDirector) {
      return NextResponse.json({ success: false, error: "Only the director can update the plan" }, { status: 403 });
    }

    const body = await request.json();
    const { title, goals } = body as { title?: string; goals?: PlanGoal[] };

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json({ success: false, error: "Title is required" }, { status: 400 });
    }

    if (!Array.isArray(goals)) {
      return NextResponse.json({ success: false, error: "Goals must be an array" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    // Read current settings, merge plan in
    const { data: team, error: readError } = await supabase
      .from("teams")
      .select("settings")
      .eq("id", id)
      .single();

    if (readError) {
      return NextResponse.json({ success: false, error: readError.message }, { status: 500 });
    }

    const currentSettings = (team?.settings || {}) as Record<string, unknown>;
    const updatedSettings = {
      ...currentSettings,
      plan: {
        title: title.trim(),
        goals: goals.map((g) => ({
          id: g.id,
          text: g.text,
          completed: Boolean(g.completed),
        })),
        updatedAt: new Date().toISOString(),
        updatedBy: context.accountId,
      },
    };

    const { error: updateError } = await supabase
      .from("teams")
      .update({ settings: updatedSettings })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: updatedSettings.plan });
  } catch (err) {
    logger.error("TeamPlanPUT", "Failed to update plan", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
