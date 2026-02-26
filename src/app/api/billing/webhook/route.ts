/**
 * POST /api/billing/webhook
 *
 * Handles Stripe webhook events for per-seat team billing.
 *
 * Events handled:
 * - checkout.session.completed: New subscription (per-seat)
 * - customer.subscription.created/updated: Tier / quantity changes
 * - customer.subscription.deleted: Cancellation → downgrade team to free
 * - invoice.payment_succeeded: Renewal → reset team tokens
 * - invoice.payment_failed: Log activity
 */

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe, getTierFromPriceId, TIER_TOKEN_LIMITS } from "@/lib/stripe/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { TIER_MAX_MEMBERS } from "@/lib/constants/tiers";
import type Stripe from "stripe";
import type { SubscriptionTier } from "@/types";
import { logger } from "@/lib/logger";

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
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      logger.error("Webhook", "STRIPE_WEBHOOK_SECRET not configured");
      return NextResponse.json({ error: "Configuration error" }, { status: 500 });
    }
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
  } catch (err) {
    logger.error("Webhook", "Signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (!relevantEvents.has(event.type)) {
    return NextResponse.json({ received: true });
  }

  // Idempotency: skip already-processed events
  const supabaseTop = createSupabaseAdmin();
  const { error: dupError } = await supabaseTop
    .from("stripe_webhook_events")
    .insert({ event_id: event.id, event_type: event.type });

  if (dupError) {
    if (dupError.code === "23505") {
      logger.info("Webhook", `Duplicate event ${event.id}, skipping`);
      return NextResponse.json({ received: true });
    }
    // Non-duplicate DB error — log but continue (better to process twice than miss)
    logger.error("Webhook", "Failed to record event for idempotency", {
      eventId: event.id,
      error: dupError.message,
      code: dupError.code,
    });
  }

  logger.info("Webhook", `Processing event: ${event.type}`);

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
    // Remove idempotency record so Stripe retry can re-process this event
    await supabaseTop.from("stripe_webhook_events").delete().eq("event_id", event.id);
    logger.error("Webhook", "Handler error", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

/**
 * Handle checkout.session.completed — per-seat subscription
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const supabase = createSupabaseAdmin();
  const metadata = session.metadata || {};
  const teamId = metadata.team_id;
  const accountId = metadata.account_id;
  const tier = metadata.tier as SubscriptionTier | undefined;
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  logger.info("Webhook", `Checkout completed: team=${teamId}, tier=${tier}`);

  if (!teamId) {
    logger.error("Webhook", "No team_id in session metadata");
    return;
  }

  if (!subscriptionId || !tier) {
    logger.error("Webhook", "Missing subscription or tier in checkout session");
    return;
  }

  const tokenLimit = TIER_TOKEN_LIMITS[tier] || TIER_TOKEN_LIMITS.free;

  // Get subscription to read quantity
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const seatCount = sub.items.data[0]?.quantity || 1;

  // Update team with billing data
  const maxMembers = TIER_MAX_MEMBERS[tier] || TIER_MAX_MEMBERS.free;
  const { error: updateError } = await supabase
    .from("teams")
    .update({
      tier,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      token_limit: tokenLimit,
      max_members: maxMembers,
      tokens_used: 0,
      weekly_tokens_used: 0,
      week_start_date: new Date().toISOString(),
      billing_cycle_start: new Date().toISOString(),
      seat_count: seatCount,
    })
    .eq("id", teamId);

  if (updateError) {
    logger.error("Webhook", "Failed to update team:", updateError);
    return;
  }

  logger.info("Webhook", `Team ${teamId} upgraded to ${tier} (${seatCount} seats)`);

  // Log activity
  if (accountId) {
    await supabase.from("activity_logs").insert({
      account_id: accountId,
      event_type: "subscription_created",
      message: `Team subscribed to ${tier} plan (${seatCount} seats)`,
      metadata: {
        team_id: teamId,
        tier,
        seat_count: seatCount,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
      },
    });

    // Record payment history
    await supabase.from("payment_history").insert({
      account_id: accountId,
      team_id: teamId,
      stripe_checkout_session_id: session.id,
      payment_type: "subscription",
      tier_or_package: tier,
      amount_cents: session.amount_total || 0,
      currency: session.currency || "usd",
      status: "succeeded",
      completed_at: new Date().toISOString(),
    });
  }
}

/**
 * Handle subscription changes (tier / quantity changes)
 */
async function handleSubscriptionChange(
  subscription: Stripe.Subscription,
  eventType: string
) {
  const supabase = createSupabaseAdmin();
  const customerId = subscription.customer as string;
  const priceId = subscription.items.data[0]?.price.id ?? "";
  const quantity = subscription.items.data[0]?.quantity || 1;

  logger.info("Webhook", `Subscription ${eventType}: customer=${customerId}, priceId=${priceId}, quantity=${quantity}`);

  // Resolve tier
  let tier = getTierFromPriceId(priceId);
  if (!tier && subscription.metadata?.tier) {
    tier = subscription.metadata.tier as SubscriptionTier;
  }
  if (!tier) {
    logger.warn("Webhook", `Unknown price ID: ${priceId} - skipping`);
    return;
  }

  const tokenLimit = TIER_TOKEN_LIMITS[tier];

  // Find team by stripe_customer_id
  const { data: team } = await supabase
    .from("teams")
    .select("id, tier, owner_account_id")
    .eq("stripe_customer_id", customerId)
    .is("deleted_at", null)
    .single();

  if (!team) {
    logger.error("Webhook", "Team not found for customer:", customerId);
    return;
  }

  const oldTier = team.tier;

  // Update team
  const maxMembers = TIER_MAX_MEMBERS[tier] || TIER_MAX_MEMBERS.free;
  const { error: updateError } = await supabase
    .from("teams")
    .update({
      tier,
      token_limit: tokenLimit,
      max_members: maxMembers,
      stripe_subscription_id: subscription.id,
      seat_count: quantity,
    })
    .eq("id", team.id);

  if (updateError) {
    logger.error("Webhook", "Failed to update team:", updateError);
    return;
  }

  // Log tier change
  if (oldTier !== tier && team.owner_account_id) {
    const isUpgrade = getTierOrder(tier) > getTierOrder(oldTier);
    await supabase.from("activity_logs").insert({
      account_id: team.owner_account_id,
      event_type: isUpgrade ? "tier_upgraded" : "tier_downgraded",
      message: isUpgrade
        ? `Team upgraded from ${oldTier} to ${tier}`
        : `Team changed from ${oldTier} to ${tier}`,
      metadata: {
        team_id: team.id,
        old_tier: oldTier,
        new_tier: tier,
        seat_count: quantity,
      },
    });
  }

  logger.info("Webhook", `Team ${team.id}: ${oldTier} → ${tier} (${quantity} seats)`);
}

/**
 * Handle subscription deletion → downgrade team to free
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const supabase = createSupabaseAdmin();
  const customerId = subscription.customer as string;
  const deletedSubscriptionId = subscription.id;

  logger.info("Webhook", `Subscription deleted: ${deletedSubscriptionId}`);

  // Find team
  const { data: team } = await supabase
    .from("teams")
    .select("id, tier, stripe_subscription_id, owner_account_id")
    .eq("stripe_customer_id", customerId)
    .is("deleted_at", null)
    .single();

  if (!team) {
    logger.error("Webhook", "Team not found for cancelled subscription");
    return;
  }

  // Check if this is the current subscription
  if (team.stripe_subscription_id && team.stripe_subscription_id !== deletedSubscriptionId) {
    logger.info("Webhook", `Deleted sub ${deletedSubscriptionId} is not current (${team.stripe_subscription_id}). Skipping downgrade.`);
    return;
  }

  // Check if customer has any other active subscriptions
  try {
    const activeSubs = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (activeSubs.data.length > 0) {
      logger.info("Webhook", `Customer ${customerId} has active sub. Skipping downgrade.`);
      return;
    }
  } catch (err) {
    logger.error("Webhook", "Failed to check active subs:", err);
  }

  const oldTier = team.tier;

  // Downgrade team to free
  const { error: updateError } = await supabase
    .from("teams")
    .update({
      tier: "free",
      token_limit: TIER_TOKEN_LIMITS.free,
      max_members: TIER_MAX_MEMBERS.free,
      stripe_subscription_id: null,
    })
    .eq("id", team.id);

  if (updateError) {
    logger.error("Webhook", "Failed to downgrade team:", updateError);
    return;
  }

  // Log activity
  if (team.owner_account_id) {
    await supabase.from("activity_logs").insert({
      account_id: team.owner_account_id,
      event_type: "subscription_cancelled",
      message: `Subscription cancelled. Team downgraded from ${oldTier} to free`,
      metadata: {
        team_id: team.id,
        old_tier: oldTier,
        subscription_id: deletedSubscriptionId,
      },
    });
  }

  logger.info("Webhook", `Team ${team.id} downgraded to free`);
}

/**
 * Handle successful invoice payment (renewal) → reset team tokens
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const supabase = createSupabaseAdmin();
  const customerId = invoice.customer as string;

  if (invoice.billing_reason !== "subscription_cycle") {
    return;
  }

  // Find team
  const { data: team } = await supabase
    .from("teams")
    .select("id, tier, owner_account_id")
    .eq("stripe_customer_id", customerId)
    .is("deleted_at", null)
    .single();

  if (!team) {
    logger.error("Webhook", "Team not found for invoice:", invoice.id);
    return;
  }

  // Reset team tokens on renewal
  const { error: updateError } = await supabase
    .from("teams")
    .update({
      tokens_used: 0,
      weekly_tokens_used: 0,
      week_start_date: new Date().toISOString(),
      billing_cycle_start: new Date().toISOString(),
    })
    .eq("id", team.id);

  if (updateError) {
    logger.error("Webhook", "Failed to reset team tokens:", updateError);
    return;
  }

  // Log activity
  if (team.owner_account_id) {
    await supabase.from("activity_logs").insert({
      account_id: team.owner_account_id,
      event_type: "monthly_reset",
      message: "Team token limit reset on subscription renewal",
      metadata: {
        team_id: team.id,
        invoice_id: invoice.id,
        amount_paid: invoice.amount_paid,
      },
    });

    await supabase.from("payment_history").insert({
      account_id: team.owner_account_id,
      team_id: team.id,
      stripe_invoice_id: invoice.id,
      payment_type: "renewal",
      tier_or_package: team.tier,
      amount_cents: invoice.amount_paid || 0,
      currency: invoice.currency || "usd",
      status: "succeeded",
      completed_at: new Date().toISOString(),
    });
  }

  logger.info("Webhook", `Team ${team.id} tokens reset on renewal`);
}

/**
 * Handle failed invoice payment
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const supabase = createSupabaseAdmin();
  const customerId = invoice.customer as string;

  logger.warn("Webhook", `Payment failed for customer: ${customerId}`);

  const { data: team } = await supabase
    .from("teams")
    .select("id, owner_account_id")
    .eq("stripe_customer_id", customerId)
    .is("deleted_at", null)
    .single();

  if (!team || !team.owner_account_id) return;

  await supabase.from("activity_logs").insert({
    account_id: team.owner_account_id,
    event_type: "payment_failed",
    message: "Payment failed - please update your payment method",
    metadata: {
      team_id: team.id,
      invoice_id: invoice.id,
      amount_due: invoice.amount_due,
      attempt_count: invoice.attempt_count,
    },
  });

  await supabase.from("payment_history").insert({
    account_id: team.owner_account_id,
    team_id: team.id,
    stripe_invoice_id: invoice.id,
    payment_type: "renewal",
    amount_cents: invoice.amount_due || 0,
    currency: invoice.currency || "usd",
    status: "failed",
  });
}

function getTierOrder(tier: string): number {
  const order: Record<string, number> = { free: 0, pro: 1, max: 2, enterprise: 3 };
  return order[tier] ?? 0;
}
