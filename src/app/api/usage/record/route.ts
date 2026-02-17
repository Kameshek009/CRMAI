import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { z } from "zod";

const recordUsageSchema = z.object({
  tokensConsumed: z.number().positive(),
  actionType: z.string(),
  sessionId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * POST /api/usage/record
 * Record token usage from the desktop app
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
    const parsed = recordUsageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request body", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { tokensConsumed, actionType, sessionId, metadata } = parsed.data;

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
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("id, tokens_used, token_limit")
      .eq("id", account.current_team_id)
      .single();

    if (teamError || !team) {
      return NextResponse.json(
        { success: false, error: "Team not found" },
        { status: 404 }
      );
    }

    // Check if team has enough tokens
    const newTokensUsed = team.tokens_used + tokensConsumed;
    if (newTokensUsed > team.token_limit) {
      return NextResponse.json(
        {
          success: false,
          error: "Token limit exceeded",
          data: {
            tokensUsed: team.tokens_used,
            tokenLimit: team.token_limit,
            tokensRequested: tokensConsumed,
          },
        },
        { status: 429 }
      );
    }

    // Create usage record
    const { error: recordError } = await supabase
      .from("usage_records")
      .insert({
        account_id: account.id,
        tokens_consumed: tokensConsumed,
        action_type: actionType,
        session_id: sessionId || null,
        metadata: metadata || {},
      });

    if (recordError) {
      console.error("Failed to create usage record:", recordError);
      return NextResponse.json(
        { success: false, error: "Failed to record usage" },
        { status: 500 }
      );
    }

    // Update team tokens
    const { error: updateError } = await supabase
      .from("teams")
      .update({ tokens_used: newTokensUsed })
      .eq("id", team.id);

    if (updateError) {
      console.error("Failed to update team tokens:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to update token count" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        tokensUsed: newTokensUsed,
        tokenLimit: team.token_limit,
        tokensRemaining: team.token_limit - newTokensUsed,
      },
    });
  } catch (error) {
    console.error("Usage recording error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
