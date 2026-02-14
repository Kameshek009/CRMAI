/**
 * POST /api/billing/checkout/subscription
 *
 * Creates a checkout session for subscription upgrades (Pro/Max tiers).
 * Supports both hosted (redirect to Stripe) and embedded modes.
 *
 * Request body:
 * - tier: "pro" | "max" - the target subscription tier
 * - hosted: boolean (optional) - if true, returns URL for Stripe hosted checkout
 *
 * Returns:
 * - For hosted: url - redirect URL to Stripe checkout
 * - For embedded: clientSecret - for mounting EmbeddedCheckout
 * - sessionId: string - checkout session ID
 */

import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import {
  createSubscriptionCheckout,
  SUBSCRIPTION_PRICES,
} from "@/lib/stripe/server";
import { getOrCreateStripeCustomer } from "@/lib/stripe/customer";
import type { SubscriptionTier } from "@/types";

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user details from Clerk
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { tier, hosted = false } = body as { tier: SubscriptionTier; hosted?: boolean };

    // Validate tier
    if (!tier || !["pro", "max"].includes(tier)) {
      return NextResponse.json(
        { success: false, error: "Invalid tier. Must be 'pro' or 'max'" },
        { status: 400 }
      );
    }

    // Get price ID for tier
    const priceId = SUBSCRIPTION_PRICES[tier as keyof typeof SUBSCRIPTION_PRICES];
    if (!priceId) {
      return NextResponse.json(
        { success: false, error: `Price ID not configured for tier: ${tier}` },
        { status: 500 }
      );
    }

    // Get account from Supabase
    const supabase = createSupabaseAdmin();
    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("*")
      .eq("clerk_user_id", userId)
      .single();

    if (accountError || !account) {
      console.error("[Checkout] Account not found:", accountError);
      return NextResponse.json(
        { success: false, error: "Account not found" },
        { status: 404 }
      );
    }

    // Check if user already has an active subscription at this tier or higher
    if (account.tier === tier) {
      return NextResponse.json(
        { success: false, error: `You are already on the ${tier} plan` },
        { status: 400 }
      );
    }

    const tierOrder = ["free", "pro", "max", "enterprise"];
    const currentTierIndex = tierOrder.indexOf(account.tier);
    const targetTierIndex = tierOrder.indexOf(tier);

    if (currentTierIndex >= targetTierIndex && account.tier !== "free") {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot downgrade via checkout. Use subscription management instead.`,
        },
        { status: 400 }
      );
    }

    // Log account state for debugging
    console.log(`[Checkout] ========== UPGRADE REQUEST ==========`);
    console.log(`[Checkout] Target tier: ${tier}`);
    console.log(`[Checkout] Account ID: ${account.id}`);
    console.log(`[Checkout] Current tier: ${account.tier}`);
    console.log(`[Checkout] stripe_subscription_id: ${account.stripe_subscription_id || 'NULL'}`);
    console.log(`[Checkout] stripe_customer_id: ${account.stripe_customer_id || 'NULL'}`);
    console.log(`[Checkout] =====================================`);

    // If user has an existing subscription, we need to handle the upgrade carefully
    // Option 1: Cancel old subscription and create new checkout for new tier
    // Option 2: Use Stripe Billing Portal (but we want in-app experience)
    // We'll go with Option 1: Cancel old and create new checkout
    if (account.stripe_subscription_id) {
      console.log(`[Checkout] User has existing subscription ${account.stripe_subscription_id}, will cancel and create new checkout for ${tier}`);

      try {
        // Cancel the existing subscription immediately so we can create a new one
        const { stripe: stripeClient } = await import("@/lib/stripe/server");

        // First check subscription status
        const existingSub = await stripeClient.subscriptions.retrieve(account.stripe_subscription_id);
        console.log(`[Checkout] Existing subscription status: ${existingSub.status}`);

        if (existingSub.status === "active" || existingSub.status === "trialing") {
          // Cancel immediately to allow new subscription
          await stripeClient.subscriptions.cancel(account.stripe_subscription_id);
          console.log(`[Checkout] Cancelled existing subscription ${account.stripe_subscription_id}`);
        }

        // Clear the subscription ID from database so checkout can proceed
        await supabase
          .from("accounts")
          .update({
            stripe_subscription_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", account.id);

        console.log(`[Checkout] Cleared subscription ID from database, proceeding to create new checkout`);

        // Fall through to create new checkout session below
      } catch (cancelError) {
        console.error("[Checkout] Failed to cancel existing subscription:", cancelError);
        // Continue to checkout anyway - Stripe will handle it
      }
    }

    // Get primary email from Clerk
    const primaryEmail = user.emailAddresses.find(
      (e) => e.id === user.primaryEmailAddressId
    )?.emailAddress;

    if (!primaryEmail) {
      return NextResponse.json(
        { success: false, error: "No email address found" },
        { status: 400 }
      );
    }

    // Get or create permanent Stripe customer BEFORE checkout
    const customerId = await getOrCreateStripeCustomer({
      accountId: account.id,
      clerkUserId: userId,
      email: primaryEmail,
      name: user.fullName || undefined,
      existingStripeCustomerId: account.stripe_customer_id,
    });

    // Build return URL
    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/account/billing/return`;

    // Create checkout session (hosted or embedded)
    const session = await createSubscriptionCheckout({
      customerId,
      priceId,
      accountId: account.id,
      clerkUserId: userId,
      tier,
      returnUrl,
      hosted,
    });

    console.log(`[Checkout] Created ${hosted ? 'hosted' : 'embedded'} subscription session: ${session.id} for tier: ${tier}`);

    // Return appropriate data based on checkout mode
    if (hosted) {
      return NextResponse.json({
        success: true,
        data: {
          url: session.url,
          sessionId: session.id,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        clientSecret: session.client_secret,
        sessionId: session.id,
      },
    });
  } catch (error) {
    console.error("[Checkout] Error creating subscription session:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create checkout session",
      },
      { status: 500 }
    );
  }
}
