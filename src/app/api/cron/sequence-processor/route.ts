import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * Cron endpoint: processes email sequence enrollments.
 * Finds enrollments with next_send_at <= now() and status = 'active',
 * logs the email (INSERT into email_communications),
 * records the send, and advances to the next step.
 *
 * Should be called every 15 minutes via Vercel cron or external scheduler.
 */
export async function GET(request: NextRequest) {
  try {
    // Auth via CRON_SECRET — fail closed if not configured
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createSupabaseAdmin();
    const now = new Date().toISOString();

    // Find due enrollments
    const { data: dueEnrollments, error: fetchError } = await supabase
      .from("email_sequence_enrollments")
      .select("*, email_sequences(team_id, name)")
      .eq("status", "active")
      .lte("next_send_at", now)
      .limit(100);

    if (fetchError) {
      logger.error("SeqProcessor", "Failed to fetch due enrollments", fetchError);
      return NextResponse.json({ success: false, error: "DB error" }, { status: 500 });
    }

    if (!dueEnrollments || dueEnrollments.length === 0) {
      return NextResponse.json({ success: true, processed: 0 });
    }

    let processed = 0;
    let completed = 0;

    for (const enrollment of dueEnrollments) {
      try {
        const teamId = (enrollment.email_sequences as { team_id: string })?.team_id;
        if (!teamId) continue;

        // Get all steps for this sequence
        const { data: steps } = await supabase
          .from("email_sequence_steps")
          .select("*")
          .eq("sequence_id", enrollment.sequence_id)
          .order("position", { ascending: true });

        if (!steps || steps.length === 0) continue;

        const currentStep = steps[enrollment.current_step];
        if (!currentStep) {
          // No more steps — mark as completed
          await supabase
            .from("email_sequence_enrollments")
            .update({ status: "completed", updated_at: now })
            .eq("id", enrollment.id);
          completed++;
          continue;
        }

        // Resolve recipient email
        let toEmail: string | null = null;
        if (enrollment.contact_id) {
          const { data: contact } = await supabase
            .from("contacts")
            .select("email")
            .eq("id", enrollment.contact_id)
            .single();
          toEmail = contact?.email || null;
        }

        if (!toEmail) {
          // Skip if no email found
          await supabase
            .from("email_sequence_enrollments")
            .update({ status: "completed", updated_at: now })
            .eq("id", enrollment.id);
          continue;
        }

        // Log email (current system logs, doesn't actually send via SMTP)
        await supabase.from("email_communications").insert({
          team_id: teamId,
          account_id: enrollment.enrolled_by,
          contact_id: enrollment.contact_id || null,
          from_email: "sequence@nexxuscrm.com",
          to_emails: [toEmail],
          subject: currentStep.subject,
          body_text: currentStep.body,
          direction: "outbound",
          status: "sent",
        });

        // Record send
        await supabase.from("email_sequence_sends").insert({
          enrollment_id: enrollment.id,
          step_id: currentStep.id,
          status: "sent",
        });

        // Advance to next step
        const nextStepIndex = enrollment.current_step + 1;
        if (nextStepIndex >= steps.length) {
          // Sequence complete
          await supabase
            .from("email_sequence_enrollments")
            .update({ status: "completed", current_step: nextStepIndex, updated_at: now })
            .eq("id", enrollment.id);
          completed++;
        } else {
          // Calculate next send time
          const nextStep = steps[nextStepIndex];
          const nextSendAt = new Date();
          nextSendAt.setDate(nextSendAt.getDate() + nextStep.delay_days);

          await supabase
            .from("email_sequence_enrollments")
            .update({
              current_step: nextStepIndex,
              next_send_at: nextSendAt.toISOString(),
              updated_at: now,
            })
            .eq("id", enrollment.id);
        }

        processed++;
      } catch (e) {
        logger.error("SeqProcessor", `Failed to process enrollment ${enrollment.id}`, e);
      }
    }

    return NextResponse.json({ success: true, processed, completed });
  } catch (error) {
    logger.error("SeqProcessor", "Error", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
