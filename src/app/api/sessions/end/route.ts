import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { z } from "zod";

const endSessionSchema = z.object({
  sessionId: z.string().uuid(),
  status: z.enum(["completed", "error"]).default("completed"),
  summary: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * POST /api/sessions/end
 * End an active agent session
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = endSessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request body", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { sessionId, status, summary, metadata } = parsed.data;

    // Get account
    const { data: account, error: accountError } = await createSupabaseAdmin()
      .from("accounts")
      .select("id")
      .eq("clerk_user_id", userId)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { success: false, error: "Account not found" },
        { status: 404 }
      );
    }

    // Get and verify session belongs to user
    const { data: session, error: sessionError } = await createSupabaseAdmin()
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("account_id", account.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 }
      );
    }

    if (session.status !== "active") {
      return NextResponse.json(
        { success: false, error: "Session is not active" },
        { status: 400 }
      );
    }

    // Update session
    const { data: updatedSession, error: updateError } = await createSupabaseAdmin()
      .from("sessions")
      .update({
        status,
        ended_at: new Date().toISOString(),
        summary: summary || session.summary,
      })
      .eq("id", sessionId)
      .select()
      .single();

    if (updateError) {
      console.error("Failed to end session:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to end session" },
        { status: 500 }
      );
    }

    // Log activity
    await createSupabaseAdmin().from("activity_logs").insert({
      account_id: account.id,
      session_id: sessionId,
      event_type: "session_end",
      message: `Session ${status}: ${summary || "No summary provided"}`,
      metadata: {
        ...metadata,
        tokensUsed: updatedSession.tokens_used,
        duration: new Date(updatedSession.ended_at).getTime() - new Date(updatedSession.started_at).getTime(),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        sessionId: updatedSession.id,
        status: updatedSession.status,
        tokensUsed: updatedSession.tokens_used,
        startedAt: updatedSession.started_at,
        endedAt: updatedSession.ended_at,
      },
    });
  } catch (error) {
    console.error("Session end error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
