import Stripe from "stripe";
import type { SubscriptionTier } from "@/types";

export { TIER_TOKEN_LIMITS } from "@/lib/constants/tiers";

// ============================================================================
// Stripe Client (Lazy Initialization)
// ============================================================================

let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!_stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error(
        "STRIPE_SECRET_KEY is not configured. Add it to your .env.local file."
      );
    }
    _stripe = new Stripe(secretKey, {
      apiVersion: "2026-02-25.clover",
      typescript: true,
    });
  }
  return _stripe;
}

export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return getStripe()[prop as keyof Stripe];
  },
});

// ============================================================================
// Per-Seat Price IDs
// ============================================================================

/**
 * Get per-seat subscription price IDs
 */
export function getSeatPrices() {
  return {
    pro: process.env.STRIPE_PRICE_PRO_SEAT ?? null,
    max: process.env.STRIPE_PRICE_MAX_SEAT ?? null,
  };
}


/**
 * Map Stripe price ID to tier
 */
export function getTierFromPriceId(priceId: string): SubscriptionTier | null {
  const prices = getSeatPrices();
  if (priceId === prices.pro) return "pro";
  if (priceId === prices.max) return "max";
  return null;
}

// ============================================================================
// Customer Management
// ============================================================================

export async function createCustomer({
  email,
  name,
  accountId,
  clerkUserId,
  teamId,
}: {
  email: string;
  name?: string;
  accountId: string;
  clerkUserId: string;
  teamId?: string;
}) {
  return stripe.customers.create({
    email,
    name,
    metadata: {
      supabase_account_id: accountId,
      clerk_user_id: clerkUserId,
      team_id: teamId || "",
      created_from: "nexxus_crm",
    },
  });
}

export async function updateCustomer(
  customerId: string,
  data: {
    email?: string;
    name?: string;
    metadata?: Record<string, string>;
  }
) {
  return stripe.customers.update(customerId, data);
}

export async function getCustomer(customerId: string) {
  return stripe.customers.retrieve(customerId);
}

// ============================================================================
// Per-Seat Checkout
// ============================================================================

/**
 * Create a per-seat subscription checkout.
 * quantity = number of active seats in the team.
 */
export async function createPerSeatCheckout({
  customerId,
  customerEmail,
  priceId,
  seatCount,
  accountId,
  clerkUserId,
  teamId,
  tier,
  returnUrl,
  hosted = false,
}: {
  customerId?: string;
  customerEmail?: string;
  priceId: string;
  seatCount: number;
  accountId: string;
  clerkUserId: string;
  teamId: string;
  tier: SubscriptionTier;
  returnUrl: string;
  hosted?: boolean;
}) {
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    line_items: [
      {
        price: priceId,
        quantity: seatCount,
      },
    ],
    metadata: {
      account_id: accountId,
      clerk_user_id: clerkUserId,
      team_id: teamId,
      tier: tier,
      type: "subscription",
    },
    subscription_data: {
      metadata: {
        account_id: accountId,
        clerk_user_id: clerkUserId,
        team_id: teamId,
        tier: tier,
      },
    },
    payment_method_types: ["card", "link"],
    allow_promotion_codes: true,
  };

  if (hosted) {
    sessionParams.success_url = `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`;
    sessionParams.cancel_url = `${returnUrl}?canceled=true`;
  } else {
    sessionParams.ui_mode = "embedded";
    sessionParams.redirect_on_completion = "if_required";
    sessionParams.return_url = `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`;
  }

  if (customerId) {
    sessionParams.customer = customerId;
  } else if (customerEmail) {
    sessionParams.customer_email = customerEmail;
    sessionParams.customer_creation = "always";
  }

  return stripe.checkout.sessions.create(sessionParams);
}

/**
 * Retrieve a checkout session with expanded data
 */
export async function getCheckoutSession(sessionId: string) {
  return stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["customer", "subscription", "payment_intent"],
  });
}

// ============================================================================
// Subscription Management
// ============================================================================

export async function getSubscription(subscriptionId: string) {
  return stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["default_payment_method", "latest_invoice"],
  });
}

/**
 * Update subscription seat count (per-seat billing).
 * Stripe automatically prorates the charge.
 */
export async function updateSubscriptionQuantity(
  subscriptionId: string,
  newQuantity: number
) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const itemId = subscription.items.data[0]?.id;
  if (!itemId) throw new Error("No subscription item found");

  return stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: itemId,
        quantity: newQuantity,
      },
    ],
    proration_behavior: "create_prorations",
  });
}

/**
 * Update subscription plan (change tier)
 */
export async function updateSubscription(
  subscriptionId: string,
  newPriceId: string,
  metadata?: Record<string, string>
) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  return stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0]!.id,
        price: newPriceId,
      },
    ],
    proration_behavior: "create_prorations",
    metadata,
  });
}

export async function cancelSubscription(subscriptionId: string) {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

export async function reactivateSubscription(subscriptionId: string) {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}

export async function cancelSubscriptionImmediately(subscriptionId: string) {
  return stripe.subscriptions.cancel(subscriptionId);
}

// ============================================================================
// Customer Portal
// ============================================================================

export async function createPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string;
  returnUrl: string;
}) {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

// ============================================================================
// Invoices & Payment History
// ============================================================================

export async function getCustomerInvoices(
  customerId: string,
  limit: number = 10
) {
  return stripe.invoices.list({
    customer: customerId,
    limit,
  });
}

export async function getUpcomingInvoice(customerId: string) {
  try {
    return await stripe.invoices.createPreview({
      customer: customerId,
    });
  } catch {
    return null;
  }
}

// ============================================================================
// Webhook Verification
// ============================================================================

export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  }
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

// ============================================================================
// Payment Methods
// ============================================================================

export async function getDefaultPaymentMethod(customerId: string) {
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return null;

  if (customer.invoice_settings?.default_payment_method) {
    return stripe.paymentMethods.retrieve(
      customer.invoice_settings.default_payment_method as string
    );
  }

  return null;
}

export async function listPaymentMethods(customerId: string) {
  return stripe.paymentMethods.list({
    customer: customerId,
    type: "card",
  });
}
