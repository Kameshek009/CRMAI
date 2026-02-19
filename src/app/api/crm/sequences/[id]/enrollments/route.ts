import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext } from "@/lib/crm/team-helpers";
import { z } from "zod";
import { logger } from "@/lib/logger";

const updateEnrollmentSchema = z.object({
  enrollment_id: z.string().uuid(),
  status: z.enum(["active", "paused", "completed", "exited_reply"]),
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
      .from("email_sequence_enrollments")
      .select("*, contacts(id, first_name, last_name, email)")
      .eq("sequence_id", id)
      .order("created_at", { ascending: false });

    if (dbError) {
      logger.error("SeqEnrollments", "GET error", dbError);
      return NextResponse.json({ success: false, error: "Failed to fetch enrollments" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    logger.error("SeqEnrollments", "GET error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const body = await request.json();
    const parsed = updateEnrollmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data, error: dbError } = await supabase
      .from("email_sequence_enrollments")
      .update({
        status: parsed.data.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.enrollment_id)
      .select()
      .single();

    if (dbError) {
      logger.error("SeqEnrollments", "PATCH error", dbError);
      return NextResponse.json({ success: false, error: "Failed to update enrollment" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    logger.error("SeqEnrollments", "PATCH error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
