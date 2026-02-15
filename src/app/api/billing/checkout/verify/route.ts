/**
 * GET /api/billing/checkout/verify
 *
 * Verifies a checkout session status after user returns from payment.
 * Used by the return page to display success/failure state.
 *
 * IMPORTANT: This endpoint also serves as a FALLBACK for database updates
 * in case the Stripe webhook fails or isn't configured. When the session
 * is complete, we update the database directly.
 *
 * Query params:
 * - session_id: The Stripe checkout session ID
 *
 * Returns:
 * - status: "complete" | "open" | "expired"
 * - type: "subscription" | "credit_package"
 * - tier?: string (for subscriptions)
 * - creditsFormatted?: string (for credit packages)
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
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get session ID from query params
    const sessionId = request.nextUrl.searchParams.get("session_id");
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Missing session_id" },
        { status: 400 }
      );
    }

    // Retrieve session from Stripe
    const session = await getCheckoutSession(sessionId);

    // Verify the session belongs to this user
    const sessionClerkId = session.metadata?.clerk_user_id;
    if (sessionClerkId && sessionClerkId !== userId) {
      return NextResponse.json(
        { success: false, error: "Session does not belong to this user" },
        { status: 403 }
      );
    }

    // Build response based on session type
    const type = session.metadata?.type || "unknown";
    const status = session.status;

    // ============================================================================
    // FALLBACK: Update database if session is complete
    // This handles cases where the webhook failed or wasn't configured
    // ============================================================================
    if (status === "complete") {
      const supabase = createSupabaseAdmin();
      const accountId = session.metadata?.account_id;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

      if (accountId) {
        // First, get the current account state
        const { data: account } = await supabase
          .from("accounts")
          .select("tier, stripe_subscription_id")
          .eq("id", accountId)
          .single();

        if (type === "subscription" && session.metadata?.tier) {
          const targetTier = session.metadata.tier as SubscriptionTier;
          const tokenLimit = TIER_TOKEN_LIMITS[targetTier] || TIER_TOKEN_LIMITS.free;

          // Only update if the tier doesn't match (webhook might have already done it)
          if (!account || account.tier !== targetTier) {
            logger.info("Checkout", `[Verify] FALLBACK: Updating account ${accountId} to tier=${targetTier}`);

            const { error: updateError } = await supabase
              .from("accounts")
              .update({
                tier: targetTier,
                token_limit: tokenLimit,
                stripe_customer_id: customerId,
                stripe_subscription_id: subscriptionId,
                tokens_used: 0,
                weekly_tokens_used: 0,
                week_start_date: new Date().toISOString(),
                billing_cycle_start: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("id", accountId);

            if (updateError) {
              logger.error("Checkout", "[Verify] FALLBACK: Database update failed:", updateError);
            } else {
              logger.info("Checkout", `[Verify] FALLBACK: Successfully updated account ${accountId} to ${targetTier}`);
            }
          } else {
            logger.info("Checkout", `[Verify] Account ${accountId} already has tier=${targetTier}, no update needed`);
          }
        }

        if (type === "credit_package" && session.metadata?.token_amount) {
          const tokenAmount = parseInt(session.metadata.token_amount, 10);

          // For credits, we need to ADD to existing balance
          // Check if this session was already processed by looking at payment_history
          const { data: existingPayment } = await supabase
            .from("payment_history")
            .select("id")
            .eq("stripe_checkout_session_id", session.id)
            .single();

          if (!existingPayment) {
            logger.info("Checkout", `[Verify] FALLBACK: Adding ${tokenAmount} credits to account ${accountId}`);

            // Get current credits
            const { data: currentAccount } = await supabase
              .from("accounts")
              .select("token_credits, tier")
              .eq("id", accountId)
              .single();

            const currentCredits = currentAccount?.token_credits || 0;
            const newCredits = currentCredits + tokenAmount;

            const updateData: Record<string, unknown> = {
              token_credits: newCredits,
              stripe_customer_id: customerId,
              updated_at: new Date().toISOString(),
            };

            // If user is on free tier, upgrade to enterprise
            if (currentAccount?.tier === "free") {
              updateData.tier = "enterprise";
            }

            const { error: updateError } = await supabase
              .from("accounts")
              .update(updateData)
              .eq("id", accountId);

            if (updateError) {
              logger.error("Checkout", "[Verify] FALLBACK: Credit update failed:", updateError);
            } else {
              logger.info("Checkout", `[Verify] FALLBACK: Successfully added ${tokenAmount} credits to account ${accountId}`);

              // Record payment history to prevent duplicate processing
              await supabase.from("payment_history").insert({
                account_id: accountId,
                stripe_checkout_session_id: session.id,
                payment_type: "credit_package",
                tier_or_package: session.metadata?.package_id,
                amount_cents: session.amount_total || 0,
                currency: session.currency || "usd",
                status: "succeeded",
                completed_at: new Date().toISOString(),
              });
            }
          } else {
            logger.info("Checkout", `[Verify] Credits already processed for session ${session.id}`);
          }
        }
      }
    }

    // Build response
    const responseData: Record<string, unknown> = {
      status,
      type,
    };

    if (type === "subscription" && session.metadata?.tier) {
      responseData.tier = session.metadata.tier;
    }

    if (type === "credit_package" && session.metadata?.token_amount) {
      const tokenAmount = parseInt(session.metadata.token_amount, 10);
      responseData.credits = tokenAmount;
      responseData.creditsFormatted = formatTokenAmount(tokenAmount);
    }

    return NextResponse.json({
      success: true,
      data: responseData,
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

/**
 * Format token amount for display
 */
function formatTokenAmount(amount: number): string {
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    return `${millions}M`;
  }
  if (amount >= 1_000) {
    const thousands = amount / 1_000;
    return `${thousands}K`;
  }
  return amount.toString();
}
