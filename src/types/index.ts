// ============================================================================
// Subscription Tiers
// ============================================================================

export type SubscriptionTier = "free" | "pro" | "max" | "enterprise";

export interface TierLimits {
  monthlyTokenLimit: number;
  weeklyTokenLimit: number;
  priceMonthly: number;
  priceMonthlyCents: number;
  stripePriceId: string | null;
  features: string[];
  isSubscription: boolean;  // false for enterprise (credit-based)
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    monthlyTokenLimit: 50_000,
    weeklyTokenLimit: 10_000,
    priceMonthly: 0,
    priceMonthlyCents: 0,
    stripePriceId: null,
    isSubscription: false,
    features: [
      "50K AI tokens/month",
      "10K tokens/day limit",
      "Up to 50 contacts",
      "1 company",
      "Basic pipeline (2 stages)",
      "Up to 20 tasks",
      "Community support",
      "3-day activity history",
    ],
  },
  pro: {
    monthlyTokenLimit: 10_000_000,
    weeklyTokenLimit: 500_000,
    priceMonthly: 20,
    priceMonthlyCents: 2000,
    stripePriceId: process.env.STRIPE_PRICE_PRO_MONTHLY || null,
    isSubscription: true,
    features: [
      "10M AI tokens/month",
      "Up to 200 contacts",
      "Up to 5 companies",
      "Unlimited pipeline stages",
      "AI deal insights & lead scoring",
      "Import / Export (CSV)",
      "Priority support",
      "30-day activity history",
      "Usage analytics",
      "API access",
    ],
  },
  max: {
    monthlyTokenLimit: 100_000_000,
    weeklyTokenLimit: 2_500_000,
    priceMonthly: 100,
    priceMonthlyCents: 10000,
    stripePriceId: process.env.STRIPE_PRICE_MAX_MONTHLY || null,
    isSubscription: true,
    features: [
      "100M AI tokens/month",
      "Up to 500 contacts",
      "Up to 10 companies",
      "Advanced AI automation",
      "Custom fields",
      "Advanced analytics & reports",
      "Dedicated support",
      "Unlimited activity history",
      "Custom integrations",
      "SLA guarantee",
      "Unlimited team members",
    ],
  },
  enterprise: {
    monthlyTokenLimit: 0,  // Unlimited (credit-based)
    weeklyTokenLimit: 0,   // No weekly cap for credits
    priceMonthly: 0,       // Pay-per-use
    priceMonthlyCents: 0,
    stripePriceId: null,
    isSubscription: false,
    features: [
      "Unlimited AI tokens (credit-based)",
      "25+ companies",
      "Unlimited contacts",
      "White labeling",
      "SSO (SAML / OAuth)",
      "Audit logs",
      "Dedicated infrastructure",
      "24/7 priority support",
      "Custom SLA & onboarding",
      "Volume discounts",
    ],
  },
};

// ============================================================================
// Credit Packages (Enterprise)
// ============================================================================

export interface CreditPackage {
  id: string;
  tokenAmount: number;
  priceCents: number;
  priceDisplay: string;
  displayName: string;
  stripePriceId: string | null;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: "credits_20m",
    tokenAmount: 20_000_000,
    priceCents: 2000,
    priceDisplay: "$20",
    displayName: "20M Tokens",
    stripePriceId: process.env.STRIPE_PRICE_CREDITS_20M || null,
  },
  {
    id: "credits_50m",
    tokenAmount: 50_000_000,
    priceCents: 5000,
    priceDisplay: "$50",
    displayName: "50M Tokens",
    stripePriceId: process.env.STRIPE_PRICE_CREDITS_50M || null,
  },
  {
    id: "credits_100m",
    tokenAmount: 100_000_000,
    priceCents: 10000,
    priceDisplay: "$100",
    displayName: "100M Tokens",
    stripePriceId: process.env.STRIPE_PRICE_CREDITS_100M || null,
  },
  {
    id: "credits_500m",
    tokenAmount: 500_000_000,
    priceCents: 50000,
    priceDisplay: "$500",
    displayName: "500M Tokens",
    stripePriceId: process.env.STRIPE_PRICE_CREDITS_500M || null,
  },
];

// ============================================================================
// Account
// ============================================================================

export interface Account {
  id: string;
  clerkUserId: string;
  tier: SubscriptionTier;
  tokenLimit: number;
  tokensUsed: number;
  weeklyTokensUsed: number;
  weekStartDate: Date;
  tokenCredits: number;  // For enterprise prepaid credits
  billingCycleStart: Date;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePaymentMethodId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Database row format (snake_case)
export interface AccountRow {
  id: string;
  clerk_user_id: string;
  tier: SubscriptionTier;
  token_limit: number;
  tokens_used: number;
  weekly_tokens_used: number;
  week_start_date: string;
  token_credits: number;
  billing_cycle_start: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_payment_method_id: string | null;
  created_at: string;
  updated_at: string;
}

// Transform database row to Account
export function transformAccountRow(row: AccountRow): Account {
  return {
    id: row.id,
    clerkUserId: row.clerk_user_id,
    tier: row.tier,
    tokenLimit: row.token_limit,
    tokensUsed: row.tokens_used,
    weeklyTokensUsed: row.weekly_tokens_used,
    weekStartDate: new Date(row.week_start_date),
    tokenCredits: row.token_credits,
    billingCycleStart: new Date(row.billing_cycle_start),
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    stripePaymentMethodId: row.stripe_payment_method_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

// ============================================================================
// Usage & Limits
// ============================================================================

export interface UsageStats {
  tokensUsed: number;
  tokenLimit: number;
  percentUsed: number;
  tokensRemaining: number;
  weeklyTokensUsed: number;
  weeklyTokenLimit: number;
  weeklyPercentUsed: number;
  daysRemaining: number;
  daysIntoWeek: number;
  billingCycleStart: Date;
  billingCycleEnd: Date;
  // For enterprise
  tokenCredits: number;
  isEnterprise: boolean;
}

export type UsageBlockReason =
  | "weekly_cap_exceeded"
  | "monthly_cap_exceeded"
  | "insufficient_credits"
  | "subscription_inactive";

export interface UsageCheckResult {
  allowed: boolean;
  reason?: UsageBlockReason;
  weeklyUsed?: number;
  weeklyLimit?: number;
  monthlyUsed?: number;
  monthlyLimit?: number;
  creditsRemaining?: number;
  upgradeOptions?: string[];  // tier IDs or package IDs
}

// ============================================================================
// Billing & Payments
// ============================================================================

export type PaymentType = "subscription" | "credit_package" | "upgrade" | "renewal";
export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded";

export interface PaymentHistory {
  id: string;
  accountId: string;
  stripePaymentIntentId: string | null;
  stripeInvoiceId: string | null;
  stripeCheckoutSessionId: string | null;
  paymentType: PaymentType;
  tierOrPackage: string | null;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  createdAt: Date;
  completedAt: Date | null;
}

export interface CheckoutSessionRequest {
  type: "subscription" | "credits";
  priceId?: string;
  tier?: SubscriptionTier;
  packageId?: string;
}

export interface CheckoutSessionResponse {
  clientSecret: string;
  sessionId: string;
}

// ============================================================================
// Usage Record
// ============================================================================

export interface UsageRecord {
  id: string;
  accountId: string;
  tokensConsumed: number;
  actionType: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

// ============================================================================
// Session
// ============================================================================

export type SessionStatus = "active" | "completed" | "error";

export interface AgentSession {
  id: string;
  accountId: string;
  startedAt: Date;
  endedAt: Date | null;
  tokensUsed: number;
  status: SessionStatus;
  summary: string | null;
}

// ============================================================================
// Activity Log
// ============================================================================

export type ActivityEventType =
  | "session_start"
  | "session_end"
  | "action_executed"
  | "payment_succeeded"
  | "payment_failed"
  | "subscription_created"
  | "subscription_cancelled"
  | "tier_upgraded"
  | "tier_downgraded"
  | "credits_purchased"
  | "weekly_reset"
  | "monthly_reset"
  | "error"
  | "warning"
  | "info";

export interface ActivityLog {
  id: string;
  accountId: string;
  sessionId: string | null;
  eventType: ActivityEventType;
  message: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

// ============================================================================
// API Response types
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// Dashboard Stats
// ============================================================================

export interface DashboardStats {
  totalSessions: number;
  activeSessions: number;
  tokensToday: number;
  tokensThisWeek: number;
}

// ============================================================================
// Stripe Webhook Event Data
// ============================================================================

export interface StripeWebhookMetadata {
  account_id?: string;
  clerk_user_id?: string;
  tier?: SubscriptionTier;
  package_id?: string;
  token_amount?: string;
}
