import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { z } from "zod";
import { logger } from "@/lib/logger";

const createSchema = z.object({
  label: z.string().min(1).max(200),
  position: z.number().optional(),
});

export async function GET() {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("deal_lost_reasons")
      .select("*")
      .eq("team_id", context.workspaceId)
      .order("position");

    if (dbError) {
      logger.error("LostReasons", "GET error", dbError);
      return NextResponse.json({ success: false, error: "Failed to fetch reasons" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err) {
    logger.error("LostReasons", "GET error", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "team_settings", "manage", context.isOwner);
    if (permError) return permError;

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("deal_lost_reasons")
      .insert({
        team_id: context.workspaceId,
        label: parsed.data.label,
        position: parsed.data.position ?? 0,
      })
      .select()
      .single();

    if (dbError) {
      logger.error("LostReasons", "POST error", dbError);
      return NextResponse.json({ success: false, error: "Failed to create reason" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    logger.error("LostReasons", "POST error", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
