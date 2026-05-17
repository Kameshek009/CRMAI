import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/email/send";

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

    // Batch-load all steps and contacts upfront (instead of N+1 queries in loop)
    const sequenceIds = [...new Set(dueEnrollments.map((e) => e.sequence_id))];
    const contactIds = [...new Set(dueEnrollments.map((e) => e.contact_id).filter(Boolean))] as string[];

    const [stepsResult, contactsResult] = await Promise.all([
      sequenceIds.length > 0
        ? supabase
            .from("email_sequence_steps")
            .select("id, sequence_id, position, subject, body, delay_days")
            .in("sequence_id", sequenceIds)
            .order("position", { ascending: true })
        : Promise.resolve({ data: [] as { id: string; sequence_id: string; position: number; subject: string; body: string; delay_days: number }[] }),
      contactIds.length > 0
        ? supabase.from("contacts").select("id, email").in("id", contactIds)
        : Promise.resolve({ data: [] as { id: string; email: string | null }[] }),
    ]);

    // Build lookup maps
    const stepsBySequence = new Map<string, typeof stepsResult.data>();
    for (const step of stepsResult.data || []) {
      if (!stepsBySequence.has(step.sequence_id)) stepsBySequence.set(step.sequence_id, []);
      stepsBySequence.get(step.sequence_id)!.push(step);
    }
    const contactEmailMap = new Map<string, string>();
    for (const c of (contactsResult.data || []) as { id: string; email: string | null }[]) {
      if (c.email) contactEmailMap.set(c.id, c.email);
    }

    for (const enrollment of dueEnrollments) {
      try {
        const teamId = (enrollment.email_sequences as { team_id: string })?.team_id;
        if (!teamId) continue;

        const steps = stepsBySequence.get(enrollment.sequence_id);
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

        // Resolve recipient email from pre-loaded map
        const toEmail = enrollment.contact_id ? contactEmailMap.get(enrollment.contact_id) || null : null;

        if (!toEmail) {
          await supabase
            .from("email_sequence_enrollments")
            .update({ status: "completed", updated_at: now })
            .eq("id", enrollment.id);
          continue;
        }

        // Real send via Resend. sendEmail owns the email_communications row;
        // if it returns ok:false, the row is already marked 'failed' with a
        // failure_reason, and we surface that into email_sequence_sends.
        const sendResult = await sendEmail(supabase, {
          teamId,
          accountId: enrollment.enrolled_by,
          contactId: enrollment.contact_id || null,
          from: process.env.SEQUENCE_FROM_EMAIL,
          to: [toEmail],
          subject: currentStep.subject,
          text: currentStep.body,
          tags: [
            { name: "sequence_id", value: enrollment.sequence_id },
            { name: "enrollment_id", value: enrollment.id },
            { name: "step_id", value: currentStep.id },
          ],
        });

        await supabase.from("email_sequence_sends").insert({
          enrollment_id: enrollment.id,
          step_id: currentStep.id,
          status: sendResult.ok ? "sent" : "failed",
        });

        // On send failure: don't advance the enrollment. The next cron tick
        // will retry the same step. (No backoff yet — Resend hard failures
        // typically need user intervention anyway.)
        if (!sendResult.ok) {
          logger.warn(
            "SeqProcessor",
            `Send failed for enrollment ${enrollment.id}: ${sendResult.error}`,
          );
          continue;
        }

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
          const nextStep = steps[nextStepIndex]!;
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
