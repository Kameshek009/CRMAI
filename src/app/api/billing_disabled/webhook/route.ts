/**
 * POST /api/billing/webhook
 *
 * Handles Stripe webhook events for the payment system.
 *
 * Events handled:
 * - checkout.session.completed: New subscription or credit purchase
 * - customer.subscription.created/updated: Tier changes
 * - customer.subscription.deleted: Cancellation → downgrade to free
 * - invoice.payment_succeeded: Renewal → reset tokens
 * - invoice.payment_failed: Payment failure → log activity
 */

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe, getTierFromPriceId, CREDIT_AMOUNTS, TIER_TOKEN_LIMITS } from "@/lib/stripe/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import type Stripe from "stripe";

const relevantEvents = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
]);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("[Webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (!relevantEvents.has(event.type)) {
    return NextResponse.json({ received: true });
  }

  console.log(`[Webhook] Processing event: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(subscription, event.type);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Webhook] Handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

/**
 * Handle checkout.session.completed
 * This fires for both subscriptions and one-time credit purchases
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const supabase = createSupabaseAdmin();
  const metadata = session.metadata || {};
  const type = metadata.type; // 'subscription' or 'credit_package'
  const accountId = metadata.account_id;
  const clerkUserId = metadata.clerk_user_id;

  console.log(`[Webhook] Checkout completed: type=${type}, account=${accountId}, tier=${metadata.tier}, metadata=${JSON.stringify(metadata)}`);

  if (!accountId && !clerkUserId) {
    console.error("[Webhook] No account_id or clerk_user_id in session metadata");
    return;
  }

  // Build the account lookup query
  let accountQuery = supabase.from("accounts").select("*");
  if (accountId) {
    accountQuery = accountQuery.eq("id", accountId);
  } else {
    accountQuery = accountQuery.eq("clerk_user_id", clerkUserId);
  }

  const { data: account, error: accountError } = await accountQuery.single();

  if (accountError || !account) {
    console.error("[Webhook] Account not found:", accountError);
    return;
  }

  if (type === "subscription") {
    // Handle subscription checkout
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;
    const tier = metadata.tier;

    console.log(`[Webhook] Processing subscription checkout: tier="${tier}", customerId="${customerId}", subscriptionId="${subscriptionId}"`);

    if (!subscriptionId) {
      console.error("[Webhook] No subscription ID in session");
      return;
    }

    if (!tier) {
      console.error("[Webhook] No tier in session metadata - this should never happen!");
      return;
    }

    // Get the token limit for this tier
    const tokenLimit = TIER_TOKEN_LIMITS[tier as keyof typeof TIER_TOKEN_LIMITS] || TIER_TOKEN_LIMITS.free;
    console.log(`[Webhook] Token limit for tier "${tier}": ${tokenLimit}`);

    // Update account with subscription details
    const { error: updateError } = await supabase
      .from("accounts")
      .update({
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        tier: tier,
        token_limit: tokenLimit,
        tokens_used: 0,
        weekly_tokens_used: 0,
        week_start_date: new Date().toISOString(),
        billing_cycle_start: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", account.id);

    if (updateError) {
      console.error("[Webhook] Failed to update account:", updateError);
      return;
    }

    console.log(`[Webhook] Successfully updated account ${account.id} to tier="${tier}" with token_limit=${tokenLimit}`);

    // Log activity
    await supabase.from("activity_logs").insert({
      account_id: account.id,
      event_type: "subscription_created",
      message: `Subscribed to ${tier} plan`,
      metadata: {
        tier,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        checkout_session_id: session.id,
      },
    });

    // Record payment history
    await supabase.from("payment_history").insert({
      account_id: account.id,
      stripe_checkout_session_id: session.id,
      payment_type: "subscription",
      tier_or_package: tier,
      amount_cents: session.amount_total || 0,
      currency: session.currency || "usd",
      status: "succeeded",
      completed_at: new Date().toISOString(),
    });

    console.log(`[Webhook] Account ${account.id} upgraded to ${tier}`);

  } else if (type === "credit_package") {
    // Handle credit package purchase
    const packageId = metadata.package_id;
    const tokenAmount = parseInt(metadata.token_amount || "0", 10);
    const customerId = session.customer as string;

    if (!tokenAmount) {
      console.error("[Webhook] No token_amount in credit package metadata");
      return;
    }

    // Add credits to account and update to enterprise tier if not already
    const newCredits = (account.token_credits || 0) + tokenAmount;
    const updateData: Record<string, unknown> = {
      token_credits: newCredits,
      stripe_customer_id: customerId,
      updated_at: new Date().toISOString(),
    };

    // If user is on free tier and buys credits, upgrade to enterprise
    if (account.tier === "free") {
      updateData.tier = "enterprise";
    }

    const { error: updateError } = await supabase
      .from("accounts")
      .update(updateData)
      .eq("id", account.id);

    if (updateError) {
      console.error("[Webhook] Failed to add credits:", updateError);
      return;
    }

    // Log activity
    await supabase.from("activity_logs").insert({
      account_id: account.id,
      event_type: "credits_purchased",
      message: `Purchased ${(tokenAmount / 1_000_000).toFixed(0)}M tokens`,
      metadata: {
        package_id: packageId,
        token_amount: tokenAmount,
        new_balance: newCredits,
        checkout_session_id: session.id,
      },
    });

    // Record payment history
    await supabase.from("payment_history").insert({
      account_id: account.id,
      stripe_checkout_session_id: session.id,
      payment_type: "credit_package",
      tier_or_package: packageId,
      amount_cents: session.amount_total || 0,
      currency: session.currency || "usd",
      status: "succeeded",
      completed_at: new Date().toISOString(),
    });

    console.log(`[Webhook] Account ${account.id} purchased ${tokenAmount.toLocaleString()} credits`);
  }
}

/**
 * Handle subscription changes (tier upgrades/downgrades)
 */
async function handleSubscriptionChange(
  subscription: Stripe.Subscription,
  eventType: string
) {
  const supabase = createSupabaseAdmin();
  const customerId = subscription.customer as string;
  const priceId = subscription.items.data[0]?.price.id;

  console.log(`[Webhook] handleSubscriptionChange: eventType="${eventType}", customerId="${customerId}", priceId="${priceId}"`);
  console.log(`[Webhook] Subscription metadata:`, subscription.metadata);

  // First try to get tier from price ID
  let tier = getTierFromPriceId(priceId);

  // If price ID lookup fails, try to get tier from subscription metadata
  if (!tier && subscription.metadata?.tier) {
    tier = subscription.metadata.tier as "pro" | "max";
    console.log(`[Webhook] Using tier from subscription metadata: "${tier}"`);
  }

  if (!tier) {
    console.warn(`[Webhook] Unknown price ID: ${priceId} and no tier in metadata - skipping subscription update`);
    return;
  }

  console.log(`[Webhook] Resolved tier="${tier}"`);

  const tokenLimit = TIER_TOKEN_LIMITS[tier];

  // Get current account to compare tiers
  const { data: account } = await supabase
    .from("accounts")
    .select("id, tier")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!account) {
    console.error("[Webhook] Account not found for customer:", customerId);
    return;
  }

  const oldTier = account.tier;
  const isUpgrade = getTierOrder(tier) > getTierOrder(oldTier);
  const isDowngrade = getTierOrder(tier) < getTierOrder(oldTier);

  // Update account
  const { error: updateError } = await supabase
    .from("accounts")
    .update({
      tier,
      token_limit: tokenLimit,
      stripe_subscription_id: subscription.id,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_customer_id", customerId);

  if (updateError) {
    console.error("[Webhook] Failed to update subscription:", updateError);
    return;
  }

  // Log activity if tier actually changed
  if (oldTier !== tier) {
    const eventTypeLog = isUpgrade ? "tier_upgraded" : isDowngrade ? "tier_downgraded" : "info";
    await supabase.from("activity_logs").insert({
      account_id: account.id,
      event_type: eventTypeLog,
      message: isUpgrade
        ? `Upgraded from ${oldTier} to ${tier}`
        : `Changed from ${oldTier} to ${tier}`,
      metadata: {
        old_tier: oldTier,
        new_tier: tier,
        subscription_id: subscription.id,
      },
    });
  }

  console.log(`[Webhook] Subscription ${eventType}: ${customerId} → ${tier}`);
}

/**
 * Handle subscription deletion (cancellation)
 *
 * IMPORTANT: This handler must check if the deleted subscription is the CURRENT
 * subscription for the account. During upgrades (e.g., Pro→Max), we cancel the
 * old subscription before creating a new one. The delete webhook for the old
 * subscription can arrive AFTER the new subscription is already active.
 *
 * Without this check, the delayed delete webhook would incorrectly downgrade
 * the user to free tier, overwriting their new subscription.
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const supabase = createSupabaseAdmin();
  const customerId = subscription.customer as string;
  const deletedSubscriptionId = subscription.id;

  console.log(`[Webhook] handleSubscriptionDeleted: subscriptionId="${deletedSubscriptionId}", customerId="${customerId}"`);

  // Get account with current subscription ID
  const { data: account } = await supabase
    .from("accounts")
    .select("id, tier, stripe_subscription_id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!account) {
    console.error("[Webhook] Account not found for cancelled subscription");
    return;
  }

  // CRITICAL: Check if the deleted subscription is the CURRENT subscription
  // If the account has a DIFFERENT subscription ID (or a new one was just created),
  // it means the user upgraded and we should NOT downgrade them to free
  if (account.stripe_subscription_id && account.stripe_subscription_id !== deletedSubscriptionId) {
    console.log(`[Webhook] Subscription ${deletedSubscriptionId} was deleted, but account already has a newer subscription ${account.stripe_subscription_id}. Skipping downgrade to free.`);
    return;
  }

  // ADDITIONAL SAFETY: Query Stripe to check if customer has any OTHER active subscriptions
  // This handles race conditions where the new subscription was just created but DB not yet updated
  try {
    const activeSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (activeSubscriptions.data.length > 0) {
      const activeSub = activeSubscriptions.data[0];
      console.log(`[Webhook] Customer ${customerId} has active subscription ${activeSub.id}. Skipping downgrade to free.`);

      // Update the account with the correct subscription ID if it's different
      if (activeSub.id !== account.stripe_subscription_id) {
        console.log(`[Webhook] Updating account ${account.id} with correct subscription ID ${activeSub.id}`);
        await supabase
          .from("accounts")
          .update({
            stripe_subscription_id: activeSub.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", account.id);
      }
      return;
    }
  } catch (stripeError) {
    console.error("[Webhook] Failed to check active subscriptions:", stripeError);
    // Continue with downgrade if we can't verify - safer to rely on DB state
  }

  const oldTier = account.tier;

  console.log(`[Webhook] Downgrading account ${account.id} from ${oldTier} to free (subscription ${deletedSubscriptionId} deleted, no active subscriptions found)`);

  // Downgrade to free tier
  const { error: updateError } = await supabase
    .from("accounts")
    .update({
      tier: "free",
      token_limit: TIER_TOKEN_LIMITS.free,
      stripe_subscription_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_customer_id", customerId);

  if (updateError) {
    console.error("[Webhook] Failed to downgrade account:", updateError);
    return;
  }

  // Log activity
  await supabase.from("activity_logs").insert({
    account_id: account.id,
    event_type: "subscription_cancelled",
    message: `Subscription cancelled. Downgraded from ${oldTier} to free`,
    metadata: {
      old_tier: oldTier,
      subscription_id: subscription.id,
    },
  });

  console.log(`[Webhook] Subscription cancelled: ${customerId} → free`);
}

/**
 * Handle successful invoice payment (subscription renewal)
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const supabase = createSupabaseAdmin();
  const customerId = invoice.customer as string;

  // Only reset tokens on subscription cycle renewals
  if (invoice.billing_reason !== "subscription_cycle") {
    return;
  }

  // Get account
  const { data: account } = await supabase
    .from("accounts")
    .select("id, tier")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!account) {
    console.error("[Webhook] Account not found for invoice:", invoice.id);
    return;
  }

  // Reset monthly and weekly tokens
  const { error: updateError } = await supabase
    .from("accounts")
    .update({
      tokens_used: 0,
      weekly_tokens_used: 0,
      week_start_date: new Date().toISOString(),
      billing_cycle_start: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_customer_id", customerId);

  if (updateError) {
    console.error("[Webhook] Failed to reset tokens:", updateError);
    return;
  }

  // Log activity
  await supabase.from("activity_logs").insert({
    account_id: account.id,
    event_type: "monthly_reset",
    message: "Monthly token limit reset on subscription renewal",
    metadata: {
      invoice_id: invoice.id,
      amount_paid: invoice.amount_paid,
    },
  });

  // Record payment
  await supabase.from("payment_history").insert({
    account_id: account.id,
    stripe_invoice_id: invoice.id,
    payment_type: "renewal",
    tier_or_package: account.tier,
    amount_cents: invoice.amount_paid || 0,
    currency: invoice.currency || "usd",
    status: "succeeded",
    completed_at: new Date().toISOString(),
  });

  console.log(`[Webhook] Tokens reset for ${customerId} on renewal`);
}

/**
 * Handle failed invoice payment
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const supabase = createSupabaseAdmin();
  const customerId = invoice.customer as string;

  console.warn(`[Webhook] Payment failed for customer: ${customerId}`);

  // Get account
  const { data: account } = await supabase
    .from("accounts")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!account) {
    return;
  }

  // Log activity
  await supabase.from("activity_logs").insert({
    account_id: account.id,
    event_type: "payment_failed",
    message: "Payment failed - please update your payment method",
    metadata: {
      invoice_id: invoice.id,
      amount_due: invoice.amount_due,
      attempt_count: invoice.attempt_count,
    },
  });

  // Record failed payment
  await supabase.from("payment_history").insert({
    account_id: account.id,
    stripe_invoice_id: invoice.id,
    payment_type: "renewal",
    amount_cents: invoice.amount_due || 0,
    currency: invoice.currency || "usd",
    status: "failed",
  });
}

/**
 * Get numeric order of tier for comparison
 */
function getTierOrder(tier: string): number {
  const order: Record<string, number> = {
    free: 0,
    pro: 1,
    max: 2,
    enterprise: 3,
  };
  return order[tier] ?? 0;
}
