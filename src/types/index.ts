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
  featureKeys: string[];
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
    featureKeys: [
      "billing.tierFeatures.free.0",
      "billing.tierFeatures.free.1",
      "billing.tierFeatures.free.2",
      "billing.tierFeatures.free.3",
      "billing.tierFeatures.free.4",
      "billing.tierFeatures.free.5",
      "billing.tierFeatures.free.6",
      "billing.tierFeatures.free.7",
      "billing.tierFeatures.free.8",
      "billing.tierFeatures.free.9",
    ],
  },
  pro: {
    monthlyTokenLimit: 500_000,
    weeklyTokenLimit: 100_000,
    priceMonthly: 14.99,
    priceMonthlyCents: 1499,
    stripePriceId: process.env.STRIPE_PRICE_PRO_SEAT || null,
    maxMembers: 5000,
    featureKeys: [
      "billing.tierFeatures.pro.0",
      "billing.tierFeatures.pro.1",
      "billing.tierFeatures.pro.2",
      "billing.tierFeatures.pro.3",
      "billing.tierFeatures.pro.4",
      "billing.tierFeatures.pro.5",
      "billing.tierFeatures.pro.6",
      "billing.tierFeatures.pro.7",
      "billing.tierFeatures.pro.8",
      "billing.tierFeatures.pro.9",
      "billing.tierFeatures.pro.10",
      "billing.tierFeatures.pro.11",
    ],
  },
  max: {
    monthlyTokenLimit: 1_500_000,
    weeklyTokenLimit: 300_000,
    priceMonthly: 34.99,
    priceMonthlyCents: 3499,
    stripePriceId: process.env.STRIPE_PRICE_MAX_SEAT || null,
    maxMembers: 5000,
    featureKeys: [
      "billing.tierFeatures.max.0",
      "billing.tierFeatures.max.1",
      "billing.tierFeatures.max.2",
      "billing.tierFeatures.max.3",
      "billing.tierFeatures.max.4",
      "billing.tierFeatures.max.5",
      "billing.tierFeatures.max.6",
      "billing.tierFeatures.max.7",
      "billing.tierFeatures.max.8",
      "billing.tierFeatures.max.9",
      "billing.tierFeatures.max.10",
    ],
  },
  enterprise: {
    monthlyTokenLimit: 0, // Unlimited
    weeklyTokenLimit: 0,
    priceMonthly: 0, // Custom per-seat
    priceMonthlyCents: 0,
    stripePriceId: null,
    maxMembers: 5000,
    featureKeys: [
      "billing.tierFeatures.enterprise.0",
      "billing.tierFeatures.enterprise.1",
      "billing.tierFeatures.enterprise.2",
      "billing.tierFeatures.enterprise.3",
      "billing.tierFeatures.enterprise.4",
      "billing.tierFeatures.enterprise.5",
      "billing.tierFeatures.enterprise.6",
      "billing.tierFeatures.enterprise.7",
      "billing.tierFeatures.enterprise.8",
      "billing.tierFeatures.enterprise.9",
    ],
  },
};

// ============================================================================
// Feature Limits per Tier (0 = unlimited)
// ============================================================================

export type FeatureLimitKey =
  | "contacts"
  | "companies"
  | "deals"
  | "tasks"
  | "customFields"
  | "activeAutomations"
  | "pipelineStages"
  | "emailTemplates"
  | "emailSequences"
  | "visibilityGroups"
  | "teamMembers";

export type TierFeatureLimits = Record<FeatureLimitKey, number>;

export const TIER_FEATURE_LIMITS: Record<SubscriptionTier, TierFeatureLimits> = {
  free: {
    contacts: 100,
    companies: 5,
    deals: 50,
    tasks: 50,
    customFields: 5,
    activeAutomations: 0,
    pipelineStages: 3,
    emailTemplates: 3,
    emailSequences: 0,
    visibilityGroups: 0,
    teamMembers: 3,
  },
  pro: {
    contacts: 5_000,
    companies: 500,
    deals: 2_500,
    tasks: 0,
    customFields: 30,
    activeAutomations: 10,
    pipelineStages: 0,
    emailTemplates: 25,
    emailSequences: 5,
    visibilityGroups: 3,
    teamMembers: 0,
  },
  max: {
    contacts: 25_000,
    companies: 5_000,
    deals: 15_000,
    tasks: 0,
    customFields: 100,
    activeAutomations: 50,
    pipelineStages: 0,
    emailTemplates: 100,
    emailSequences: 25,
    visibilityGroups: 10,
    teamMembers: 0,
  },
  enterprise: {
    contacts: 0,
    companies: 0,
    deals: 0,
    tasks: 0,
    customFields: 500,
    activeAutomations: 200,
    pipelineStages: 0,
    emailTemplates: 0,
    emailSequences: 0,
    visibilityGroups: 0,
    teamMembers: 0,
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
