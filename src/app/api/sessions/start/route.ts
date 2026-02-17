import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { z } from "zod";
import { logger } from "@/lib/logger";

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

    const supabase = createSupabaseAdmin();

    // Get account
    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("id, current_team_id")
      .eq("clerk_user_id", userId)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { success: false, error: "Account not found" },
        { status: 404 }
      );
    }

    // Get team billing data
    const { data: team } = await supabase
      .from("teams")
      .select("tokens_used, token_limit")
      .eq("id", account.current_team_id)
      .single();

    const teamTokensUsed = team?.tokens_used || 0;
    const teamTokenLimit = team?.token_limit || 0;

    // Check if team has tokens available
    if (teamTokensUsed >= teamTokenLimit) {
      return NextResponse.json(
        { success: false, error: "Token limit reached" },
        { status: 429 }
      );
    }

    // Create session
    const { data: session, error: sessionError } = await supabase
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
      logger.error("SessionStart", "Failed to create session", sessionError);
      return NextResponse.json(
        { success: false, error: "Failed to create session" },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from("activity_logs").insert({
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
        tokensAvailable: teamTokenLimit - teamTokensUsed,
      },
    });
  } catch (error) {
    logger.error("SessionStart", "Session start error", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
