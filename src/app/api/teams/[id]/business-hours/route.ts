import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { z } from "zod";
import { logger } from "@/lib/logger";

const daySchema = z.object({
  day_of_week: z.number().min(0).max(6),
  is_working: z.boolean(),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
});

const saveSchema = z.object({
  days: z.array(daySchema).length(7),
});

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
    const { data, error: dbError } = await supabase
      .from("business_hours")
      .select("*")
      .eq("team_id", id)
      .order("day_of_week");

    if (dbError) {
      logger.error("BusinessHours", "GET error", dbError);
      return NextResponse.json({ success: false, error: "Failed to fetch business hours" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err) {
    logger.error("BusinessHours", "GET error", err);
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

    const permError = requirePermission(context.permissions, "team_settings", "manage", context.isDirector);
    if (permError) return permError;

    const body = await request.json();
    const parsed = saveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    const rows = parsed.data.days.map((d) => ({
      team_id: id,
      day_of_week: d.day_of_week,
      is_working: d.is_working,
      start_time: d.start_time,
      end_time: d.end_time,
    }));

    const { error: dbError } = await supabase
      .from("business_hours")
      .upsert(rows, { onConflict: "team_id,day_of_week" });

    if (dbError) {
      logger.error("BusinessHours", "PUT error", dbError);
      return NextResponse.json({ success: false, error: "Failed to save business hours" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("BusinessHours", "PUT error", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
