// ============================================================================
// Subscription Tiers
// ============================================================================

export type SubscriptionTier = "free" | "pro" | "max" | "enterprise";

export interface TierLimits {
  monthlyTokenLimit: number;
  weeklyTokenLimit: number;
  /** Per-seat price */
  priceMonthlyCents: number;
  priceMonthly: number;
  stripePriceId: string | null;
  features: string[];
  maxMembers: number;
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    monthlyTokenLimit: 50_000,
    weeklyTokenLimit: 10_000,
    priceMonthly: 0,
    priceMonthlyCents: 0,
    stripePriceId: null,
    maxMembers: 3,
    features: [
      "50K AI tokens/month (team pool)",
      "Up to 50 contacts",
      "1 company",
      "Basic pipeline (2 stages)",
      "Up to 20 tasks",
      "Up to 3 team members",
      "Community support",
      "3-day activity history",
    ],
  },
  pro: {
    monthlyTokenLimit: 500_000,
    weeklyTokenLimit: 100_000,
    priceMonthly: 14.99,
    priceMonthlyCents: 1499,
    stripePriceId: process.env.STRIPE_PRICE_PRO_SEAT || null,
    maxMembers: 5000,
    features: [
      "500K AI tokens/month (team pool)",
      "Up to 200 contacts",
      "Up to 5 companies",
      "Unlimited pipeline stages",
      "AI deal insights & lead scoring",
      "Import / Export (CSV)",
      "Priority support",
      "30-day activity history",
      "Usage analytics",
      "API access",
      "Unlimited team members",
    ],
  },
  max: {
    monthlyTokenLimit: 1_500_000,
    weeklyTokenLimit: 300_000,
    priceMonthly: 34.99,
    priceMonthlyCents: 3499,
    stripePriceId: process.env.STRIPE_PRICE_MAX_SEAT || null,
    maxMembers: 5000,
    features: [
      "1.5M AI tokens/month (team pool)",
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
    monthlyTokenLimit: 0, // Unlimited
    weeklyTokenLimit: 0,
    priceMonthly: 0, // Custom per-seat
    priceMonthlyCents: 0,
    stripePriceId: null,
    maxMembers: 5000,
    features: [
      "Unlimited AI tokens (team pool)",
      "25+ companies",
      "Unlimited contacts",
      "White labeling",
      "SSO (SAML / OAuth)",
      "Audit logs",
      "Dedicated infrastructure",
      "24/7 priority support",
      "Custom SLA & onboarding",
    ],
  },
};

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
  tokenCredits: number;
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
// Team Billing
// ============================================================================

export interface TeamBilling {
  id: string;
  tier: SubscriptionTier;
  tokenLimit: number;
  tokensUsed: number;
  weeklyTokensUsed: number;
  weekStartDate: string;
  billingCycleStart: string;
  seatCount: number;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

export interface TeamBillingRow {
  id: string;
  tier: string;
  token_limit: number;
  tokens_used: number;
  weekly_tokens_used: number;
  week_start_date: string;
  billing_cycle_start: string;
  seat_count: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

export function transformTeamBillingRow(row: TeamBillingRow): TeamBilling {
  return {
    id: row.id,
    tier: row.tier as SubscriptionTier,
    tokenLimit: row.token_limit,
    tokensUsed: row.tokens_used,
    weeklyTokensUsed: row.weekly_tokens_used,
    weekStartDate: row.week_start_date,
    billingCycleStart: row.billing_cycle_start,
    seatCount: row.seat_count,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
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
  seatCount: number;
  isEnterprise: boolean;
}

export type UsageBlockReason =
  | "weekly_cap_exceeded"
  | "monthly_cap_exceeded"
  | "subscription_inactive";

export interface UsageCheckResult {
  allowed: boolean;
  reason?: UsageBlockReason;
  weeklyUsed?: number;
  weeklyLimit?: number;
  monthlyUsed?: number;
  monthlyLimit?: number;
  upgradeOptions?: string[];
}

// ============================================================================
// Billing & Payments
// ============================================================================

export type PaymentType = "subscription" | "upgrade" | "renewal";
export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded";

export interface PaymentHistory {
  id: string;
  accountId: string;
  teamId: string | null;
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
  tier: SubscriptionTier;
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
  team_id?: string;
  tier?: SubscriptionTier;
}
