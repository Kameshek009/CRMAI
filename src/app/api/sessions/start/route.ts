import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { z } from "zod";

const startSessionSchema = z.object({
  summary: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * POST /api/sessions/start
 * Start a new agent session
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
    const parsed = startSessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { summary, metadata } = parsed.data;

    // Get account
    const { data: account, error: accountError } = await createSupabaseAdmin()
      .from("accounts")
      .select("id, tokens_used, token_limit")
      .eq("clerk_user_id", userId)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { success: false, error: "Account not found" },
        { status: 404 }
      );
    }

    // Check if user has tokens available
    if (account.tokens_used >= account.token_limit) {
      return NextResponse.json(
        { success: false, error: "Token limit reached" },
        { status: 429 }
      );
    }

    // Create session
    const { data: session, error: sessionError } = await createSupabaseAdmin()
      .from("sessions")
      .insert({
        account_id: account.id,
        status: "active",
        summary: summary || null,
        tokens_used: 0,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (sessionError) {
      console.error("Failed to create session:", sessionError);
      return NextResponse.json(
        { success: false, error: "Failed to create session" },
        { status: 500 }
      );
    }

    // Log activity
    await createSupabaseAdmin().from("activity_logs").insert({
      account_id: account.id,
      session_id: session.id,
      event_type: "session_start",
      message: summary ? `Session started: ${summary}` : "Session started",
      metadata: metadata || {},
    });

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.id,
        status: session.status,
        startedAt: session.started_at,
        tokensAvailable: account.token_limit - account.tokens_used,
      },
    });
  } catch (error) {
    console.error("Session start error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
