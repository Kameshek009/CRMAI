import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { z } from "zod";
import { logger } from "@/lib/logger";

const createStepSchema = z.object({
  position: z.number().int().min(0),
  delay_days: z.number().int().min(0).max(365),
  subject: z.string().max(500),
  body: z.string().max(10000),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const { id } = await params;
    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("email_sequence_steps")
      .select("*")
      .eq("sequence_id", id)
      .order("position", { ascending: true });

    if (dbError) {
      logger.error("SeqSteps", "GET error", dbError);
      return NextResponse.json({ success: false, error: "Failed to fetch steps" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    logger.error("SeqSteps", "GET error", error);
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
    const parsed = createStepSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input", details: parsed.error.issues }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("email_sequence_steps")
      .insert({ sequence_id: id, ...parsed.data })
      .select()
      .single();

    if (dbError) {
      logger.error("SeqSteps", "POST error", dbError);
      return NextResponse.json({ success: false, error: "Failed to create step" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("SeqSteps", "POST error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
