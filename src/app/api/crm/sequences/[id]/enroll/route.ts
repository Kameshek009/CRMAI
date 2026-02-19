import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { z } from "zod";
import { logger } from "@/lib/logger";

const enrollSchema = z.object({
  contact_ids: z.array(z.string().uuid()).optional(),
  lead_ids: z.array(z.string().uuid()).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { context, error } = await getTeamContext();
    if (error) return error;

    const permError = requirePermission(context.permissions, "contacts", "update", context.isOwner);
    if (permError) return permError;

    const { id: sequenceId } = await params;
    const body = await request.json();
    const parsed = enrollSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid input" }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    // Get first step to calculate next_send_at
    const { data: steps } = await supabase
      .from("email_sequence_steps")
      .select("id, delay_days, position")
      .eq("sequence_id", sequenceId)
      .order("position", { ascending: true })
      .limit(1);

    if (!steps || steps.length === 0) {
      return NextResponse.json({ success: false, error: "Sequence has no steps" }, { status: 400 });
    }

    const firstStep = steps[0];
    const nextSendAt = new Date();
    nextSendAt.setDate(nextSendAt.getDate() + firstStep.delay_days);

    const enrollments: {
      sequence_id: string;
      contact_id?: string;
      lead_id?: string;
      enrolled_by: string;
      current_step: number;
      next_send_at: string;
    }[] = [];

    for (const contactId of parsed.data.contact_ids || []) {
      enrollments.push({
        sequence_id: sequenceId,
        contact_id: contactId,
        enrolled_by: context.accountId,
        current_step: 0,
        next_send_at: nextSendAt.toISOString(),
      });
    }

    for (const leadId of parsed.data.lead_ids || []) {
      enrollments.push({
        sequence_id: sequenceId,
        lead_id: leadId,
        enrolled_by: context.accountId,
        current_step: 0,
        next_send_at: nextSendAt.toISOString(),
      });
    }

    if (enrollments.length === 0) {
      return NextResponse.json({ success: false, error: "No contacts or leads specified" }, { status: 400 });
    }

    const { data, error: dbError } = await supabase
      .from("email_sequence_enrollments")
      .insert(enrollments)
      .select();

    if (dbError) {
      logger.error("SeqEnroll", "POST error", dbError);
      return NextResponse.json({ success: false, error: "Failed to enroll" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data, enrolled: data?.length || 0 });
  } catch (error) {
    logger.error("SeqEnroll", "POST error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
