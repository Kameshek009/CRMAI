/**
 * POST /api/billing/checkout/subscription
 *
 * Creates a per-seat checkout session for team subscription.
 * Only the team director can upgrade. Quantity = active seats.
 *
 * Request body:
 * - tier: "pro" | "max"
 * - hosted: boolean (optional)
 *
 * Returns:
 * - For hosted: url + sessionId
 * - For embedded: clientSecret + sessionId
 */

import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import {
  createPerSeatCheckout,
  getSeatPrices,
} from "@/lib/stripe/server";
import { getOrCreateStripeCustomer } from "@/lib/stripe/customer";
import type { SubscriptionTier } from "@/types";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { tier, hosted = false } = body as { tier: SubscriptionTier; hosted?: boolean };

    if (!tier || !["pro", "max"].includes(tier)) {
      return NextResponse.json(
        { success: false, error: "Invalid tier. Must be 'pro' or 'max'" },
        { status: 400 }
      );
    }

    const prices = getSeatPrices();
    const priceId = prices[tier as keyof typeof prices];
    if (!priceId) {
      return NextResponse.json(
        { success: false, error: `Price ID not configured for tier: ${tier}` },
        { status: 500 }
      );
    }

    const supabase = createSupabaseAdmin();

    // Get account
    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("id, current_team_id, stripe_customer_id")
      .eq("clerk_user_id", userId)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { success: false, error: "Account not found" },
        { status: 404 }
      );
    }

    // Get the team owned by this account
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("*")
      .eq("owner_account_id", account.id)
      .is("deleted_at", null)
      .single();

    if (teamError || !team) {
      return NextResponse.json(
        { success: false, error: "You must own a team to upgrade" },
        { status: 403 }
      );
    }

    // Verify user is the director
    if (team.owner_account_id !== account.id) {
      return NextResponse.json(
        { success: false, error: "Only the team director can upgrade" },
        { status: 403 }
      );
    }

    // Check if already on this tier
    if (team.tier === tier) {
      return NextResponse.json(
        { success: false, error: `Team is already on the ${tier} plan` },
        { status: 400 }
      );
    }

    const tierOrder = ["free", "pro", "max", "enterprise"];
    const currentTierIndex = tierOrder.indexOf(team.tier);
    const targetTierIndex = tierOrder.indexOf(tier);

    if (currentTierIndex >= targetTierIndex && team.tier !== "free") {
      return NextResponse.json(
        { success: false, error: "Cannot downgrade via checkout. Use subscription management." },
        { status: 400 }
      );
    }

    // Count active seats in the team
    const { count: activeMembers } = await supabase
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .eq("team_id", team.id)
      .eq("status", "active");

    const seatCount = Math.max(activeMembers || 1, 1);

    logger.info("Subscription", `[Checkout] Upgrade: team=${team.id}, tier=${tier}, seats=${seatCount}`);

    // Cancel existing subscription if upgrading
    if (team.stripe_subscription_id) {
      try {
        const { stripe: stripeClient } = await import("@/lib/stripe/server");
        const existingSub = await stripeClient.subscriptions.retrieve(team.stripe_subscription_id);

        if (existingSub.status === "active" || existingSub.status === "trialing") {
          await stripeClient.subscriptions.cancel(team.stripe_subscription_id);
          logger.info("Subscription", `[Checkout] Cancelled existing subscription ${team.stripe_subscription_id}`);
        }

        await supabase
          .from("teams")
          .update({ stripe_subscription_id: null })
          .eq("id", team.id);
      } catch (cancelError) {
        logger.error("Subscription", "[Checkout] Failed to cancel existing subscription:", cancelError);
      }
    }

    // Get email from Clerk
    const primaryEmail = user.emailAddresses.find(
      (e) => e.id === user.primaryEmailAddressId
    )?.emailAddress;

    if (!primaryEmail) {
      return NextResponse.json(
        { success: false, error: "No email address found" },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer({
      accountId: account.id,
      clerkUserId: userId,
      email: primaryEmail,
      name: user.fullName || undefined,
      teamId: team.id,
      existingStripeCustomerId: team.stripe_customer_id || account.stripe_customer_id,
    });

    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/account/billing/return`;

    // Create per-seat checkout
    const session = await createPerSeatCheckout({
      customerId,
      priceId,
      seatCount,
      accountId: account.id,
      clerkUserId: userId,
      teamId: team.id,
      tier,
      returnUrl,
      hosted,
    });

    logger.info("Subscription", `[Checkout] Created session: ${session.id}, ${seatCount} seats × ${tier}`);

    if (hosted) {
      return NextResponse.json({
        success: true,
        data: { url: session.url, sessionId: session.id },
      });
    }

    return NextResponse.json({
      success: true,
      data: { clientSecret: session.client_secret, sessionId: session.id },
    });
  } catch (error) {
    logger.error("Subscription", "[Checkout] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create checkout session",
      },
      { status: 500 }
    );
  }
}
