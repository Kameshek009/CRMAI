import Stripe from "stripe";
import type { SubscriptionTier } from "@/types";

// Re-export from constants for backward compatibility
export { TIER_TOKEN_LIMITS, CREDIT_AMOUNTS } from "@/lib/constants/tiers";

// ============================================================================
// Stripe Client (Lazy Initialization)
// ============================================================================

let _stripe: Stripe | null = null;

/**
 * Get Stripe client with lazy initialization.
 * Only initializes when first called, preventing module load errors.
 */
function getStripe(): Stripe {
  if (!_stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error(
        "STRIPE_SECRET_KEY is not configured. Add it to your .env.local file."
      );
    }
    _stripe = new Stripe(secretKey, {
      apiVersion: "2026-01-28.clover",
      typescript: true,
    });
  }
  return _stripe;
}

/**
 * Stripe client accessor.
 * Use this for all Stripe API calls.
 */
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return getStripe()[prop as keyof Stripe];
  },
});

// ============================================================================
// Price IDs Configuration
// ============================================================================

/**
 * Get subscription price IDs (lazy to avoid undefined at module load)
 */
export function getSubscriptionPrices() {
  return {
    pro: process.env.STRIPE_PRICE_PRO_MONTHLY || "",
    max: process.env.STRIPE_PRICE_MAX_MONTHLY || "",
  };
}

/**
 * Subscription price IDs for recurring billing
 * @deprecated Use getSubscriptionPrices() instead
 */
export const SUBSCRIPTION_PRICES = {
  get pro() { return process.env.STRIPE_PRICE_PRO_MONTHLY || ""; },
  get max() { return process.env.STRIPE_PRICE_MAX_MONTHLY || ""; },
} as const;

/**
 * Get credit package price IDs (lazy to avoid undefined at module load)
 */
export function getCreditPrices() {
  return {
    credits_20m: process.env.STRIPE_PRICE_CREDITS_20M || "",
    credits_50m: process.env.STRIPE_PRICE_CREDITS_50M || "",
    credits_100m: process.env.STRIPE_PRICE_CREDITS_100M || "",
    credits_500m: process.env.STRIPE_PRICE_CREDITS_500M || "",
  };
}

/**
 * Credit package price IDs for one-time purchases
 * @deprecated Use getCreditPrices() instead
 */
export const CREDIT_PRICES = {
  get credits_20m() { return process.env.STRIPE_PRICE_CREDITS_20M || ""; },
  get credits_50m() { return process.env.STRIPE_PRICE_CREDITS_50M || ""; },
  get credits_100m() { return process.env.STRIPE_PRICE_CREDITS_100M || ""; },
  get credits_500m() { return process.env.STRIPE_PRICE_CREDITS_500M || ""; },
} as const;

/**
 * Map Stripe price ID to tier
 */
export function getTierFromPriceId(priceId: string): SubscriptionTier | null {
  const proPriceId = SUBSCRIPTION_PRICES.pro;
  const maxPriceId = SUBSCRIPTION_PRICES.max;

  console.log(`[getTierFromPriceId] Comparing priceId="${priceId}" with pro="${proPriceId}", max="${maxPriceId}"`);

  if (priceId === proPriceId) return "pro";
  if (priceId === maxPriceId) return "max";

  console.warn(`[getTierFromPriceId] No match found for priceId="${priceId}"`);
  return null;
}

/**
 * Map Stripe price ID to credit package ID
 */
export function getCreditPackageFromPriceId(priceId: string): string | null {
  for (const [packageId, pId] of Object.entries(CREDIT_PRICES)) {
    if (pId === priceId) return packageId;
  }
  return null;
}

// ============================================================================
// Customer Management
// ============================================================================

/**
 * Create a Stripe customer with metadata for cross-referencing
 */
export async function createCustomer({
  email,
  name,
  accountId,
  clerkUserId,
}: {
  email: string;
  name?: string;
  accountId: string;
  clerkUserId: string;
}) {
  return stripe.customers.create({
    email,
    name,
    metadata: {
      supabase_account_id: accountId,
      clerk_user_id: clerkUserId,
      created_from: "serotonin_dashboard",
    },
  });
}

/**
 * Update customer metadata
 */
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

/**
 * Get customer by ID
 */
export async function getCustomer(customerId: string) {
  return stripe.customers.retrieve(customerId);
}

// ============================================================================
// Checkout Sessions
// ============================================================================

/**
 * Create a checkout session for subscriptions
 * Supports both hosted (redirect) and embedded modes
 */
export async function createSubscriptionCheckout({
  customerId,
  customerEmail,
  priceId,
  accountId,
  clerkUserId,
  tier,
  returnUrl,
  hosted = false,
}: {
  customerId?: string;
  customerEmail?: string;
  priceId: string;
  accountId: string;
  clerkUserId: string;
  tier: SubscriptionTier;
  returnUrl: string;
  hosted?: boolean;
}) {
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    metadata: {
      account_id: accountId,
      clerk_user_id: clerkUserId,
      tier: tier,
      type: "subscription",
    },
    subscription_data: {
      metadata: {
        account_id: accountId,
        clerk_user_id: clerkUserId,
        tier: tier,
      },
    },
    // Payment method options for full suite support
    payment_method_types: ["card", "link"],
    // Allow promotion codes
    allow_promotion_codes: true,
  };

  if (hosted) {
    // Hosted checkout - redirects to Stripe's hosted page
    sessionParams.success_url = `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`;
    sessionParams.cancel_url = `${returnUrl}?canceled=true`;
  } else {
    // Embedded checkout - for in-page checkout
    sessionParams.ui_mode = "embedded";
    sessionParams.redirect_on_completion = "if_required";
    sessionParams.return_url = `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`;
  }

  // Use existing customer or create one via email
  if (customerId) {
    sessionParams.customer = customerId;
  } else if (customerEmail) {
    sessionParams.customer_email = customerEmail;
    sessionParams.customer_creation = "always";
  }

  return stripe.checkout.sessions.create(sessionParams);
}

/**
 * Create a checkout session for credit purchases (one-time)
 * Supports both hosted (redirect) and embedded modes
 */
export async function createCreditsCheckout({
  customerId,
  customerEmail,
  priceId,
  packageId,
  tokenAmount,
  accountId,
  clerkUserId,
  returnUrl,
  hosted = false,
}: {
  customerId?: string;
  customerEmail?: string;
  priceId: string;
  packageId: string;
  tokenAmount: number;
  accountId: string;
  clerkUserId: string;
  returnUrl: string;
  hosted?: boolean;
}) {
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    metadata: {
      account_id: accountId,
      clerk_user_id: clerkUserId,
      package_id: packageId,
      token_amount: tokenAmount.toString(),
      type: "credit_package",
    },
    payment_method_types: ["card", "link"],
    allow_promotion_codes: true,
  };

  if (hosted) {
    // Hosted checkout - redirects to Stripe's hosted page
    sessionParams.success_url = `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`;
    sessionParams.cancel_url = `${returnUrl}?canceled=true`;
  } else {
    // Embedded checkout - for in-page checkout
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

/**
 * Get subscription details
 */
export async function getSubscription(subscriptionId: string) {
  return stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["default_payment_method", "latest_invoice"],
  });
}

/**
 * Update subscription (change plan)
 */
export async function updateSubscription(
  subscriptionId: string,
  newPriceId: string,
  metadata?: Record<string, string>
) {
  // Get current subscription
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  return stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ],
    proration_behavior: "create_prorations",
    metadata,
  });
}

/**
 * Cancel subscription at period end
 */
export async function cancelSubscription(subscriptionId: string) {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

/**
 * Reactivate cancelled subscription
 */
export async function reactivateSubscription(subscriptionId: string) {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}

/**
 * Cancel subscription immediately
 */
export async function cancelSubscriptionImmediately(subscriptionId: string) {
  return stripe.subscriptions.cancel(subscriptionId);
}

// ============================================================================
// Customer Portal
// ============================================================================

/**
 * Create a Stripe customer portal session
 */
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

/**
 * Get customer invoices
 */
export async function getCustomerInvoices(
  customerId: string,
  limit: number = 10
) {
  return stripe.invoices.list({
    customer: customerId,
    limit,
  });
}

/**
 * Get upcoming invoice (for proration preview)
 */
export async function getUpcomingInvoice(customerId: string) {
  try {
    return await stripe.invoices.createPreview({
      customer: customerId,
    });
  } catch {
    // No upcoming invoice (no active subscription)
    return null;
  }
}

// ============================================================================
// Webhook Verification
// ============================================================================

/**
 * Construct and verify webhook event
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );
}

// ============================================================================
// Payment Methods
// ============================================================================

/**
 * Get customer's default payment method
 */
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

/**
 * List customer's payment methods
 */
export async function listPaymentMethods(customerId: string) {
  return stripe.paymentMethods.list({
    customer: customerId,
    type: "card",
  });
}
