/**
 * GET /api/billing/checkout/verify
 *
 * Verifies a checkout session status after payment return.
 * FALLBACK: Updates team if webhook didn't fire.
 *
 * Query params:
 * - session_id: The Stripe checkout session ID
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCheckoutSession } from "@/lib/stripe/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { TIER_TOKEN_LIMITS } from "@/lib/constants/tiers";
import type { SubscriptionTier } from "@/types";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const sessionId = request.nextUrl.searchParams.get("session_id");
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Missing session_id" },
        { status: 400 }
      );
    }

    const session = await getCheckoutSession(sessionId);

    // Verify session belongs to this user
    const sessionClerkId = session.metadata?.clerk_user_id;
    if (sessionClerkId && sessionClerkId !== userId) {
      return NextResponse.json(
        { success: false, error: "Session does not belong to this user" },
        { status: 403 }
      );
    }

    const status = session.status;

    // Fallback: update team if session is complete
    if (status === "complete") {
      const supabase = createSupabaseAdmin();
      const teamId = session.metadata?.team_id;
      const tier = session.metadata?.tier as SubscriptionTier | undefined;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

      if (teamId && tier) {
        const { data: team } = await supabase
          .from("teams")
          .select("tier")
          .eq("id", teamId)
          .single();

        if (!team || team.tier !== tier) {
          const tokenLimit = TIER_TOKEN_LIMITS[tier] || TIER_TOKEN_LIMITS.free;

          logger.info("Checkout", `[Verify] FALLBACK: Updating team ${teamId} to tier=${tier}`);

          const { error: updateError } = await supabase
            .from("teams")
            .update({
              tier,
              token_limit: tokenLimit,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              tokens_used: 0,
              weekly_tokens_used: 0,
              week_start_date: new Date().toISOString(),
              billing_cycle_start: new Date().toISOString(),
            })
            .eq("id", teamId);

          if (updateError) {
            logger.error("Checkout", "[Verify] FALLBACK: Update failed:", updateError);
          } else {
            logger.info("Checkout", `[Verify] FALLBACK: Team ${teamId} updated to ${tier}`);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        status,
        type: "subscription",
        tier: session.metadata?.tier,
      },
    });
  } catch (error) {
    logger.error("Checkout", "[Verify Checkout] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to verify session",
      },
      { status: 500 }
    );
  }
}
