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

    // Check if user has enough tokens
    const newTokensUsed = account.tokens_used + tokensConsumed;
    if (newTokensUsed > account.token_limit) {
      return NextResponse.json(
        {
          success: false,
          error: "Token limit exceeded",
          data: {
            tokensUsed: account.tokens_used,
            tokenLimit: account.token_limit,
            tokensRequested: tokensConsumed,
          },
        },
        { status: 429 }
      );
    }

    // Create usage record
    const { error: recordError } = await createSupabaseAdmin()
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

    // Update account tokens
    const { error: updateError } = await createSupabaseAdmin()
      .from("accounts")
      .update({ tokens_used: newTokensUsed, updated_at: new Date().toISOString() })
      .eq("id", account.id);

    if (updateError) {
      console.error("Failed to update account:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to update token count" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        tokensUsed: newTokensUsed,
        tokenLimit: account.token_limit,
        tokensRemaining: account.token_limit - newTokensUsed,
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
