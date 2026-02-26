import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";
import { z } from "zod";
import { logger } from "@/lib/logger";

const enrollSchema = z.object({
  contact_ids: z.array(z.string().uuid()).optional(),
});

export const POST = withApiHandler(
  {
    permission: { resource: "contacts", action: "update" },
    bodySchema: enrollSchema,
    logTag: "SeqEnroll",
  },
  async (_request, ctx, { body, routeParams }) => {
    const { id: sequenceId } = routeParams;
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

    const firstStep = steps[0]!;
    const nextSendAt = new Date();
    nextSendAt.setDate(nextSendAt.getDate() + firstStep.delay_days);

    const contactIds = body.contact_ids || [];

    // Verify all contact_ids belong to the team
    if (contactIds.length > 0) {
      const { count } = await supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .in("id", contactIds)
        .eq("team_id", ctx.workspaceId)
        .eq("is_deleted", false);
      if (count !== contactIds.length) {
        return NextResponse.json({ success: false, error: "Some contacts not found or not accessible" }, { status: 400 });
      }
    }

    const enrollments = contactIds.map((contactId: string) => ({
      sequence_id: sequenceId,
      contact_id: contactId,
      enrolled_by: ctx.accountId,
      current_step: 0,
      next_send_at: nextSendAt.toISOString(),
    }));

    if (enrollments.length === 0) {
      return NextResponse.json({ success: false, error: "No contacts specified" }, { status: 400 });
    }

    const { data, error: dbError } = await supabase
      .from("email_sequence_enrollments")
      .insert(enrollments)
      .select();

    if (dbError) {
      logger.error("SeqEnroll", "POST error", dbError);
      throw new ApiError("Failed to enroll", 500);
    }

    return NextResponse.json({ success: true, data, enrolled: data?.length || 0 });
  }
);
