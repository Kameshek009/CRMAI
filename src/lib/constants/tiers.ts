/**
 * Tier Constants
 *
 * Token limits and tier configuration constants.
 * Separated from Stripe initialization to prevent module load errors.
 */

import type { SubscriptionTier } from "@/types";

/**
 * Token limits per tier (monthly)
 */
export const TIER_TOKEN_LIMITS: Record<SubscriptionTier, number> = {
  free: 50_000,
  pro: 500_000,
  max: 1_500_000_000,
  enterprise: 0, // Credit-based, no monthly limit
};

/**
 * Daily token limits (resets every 24h)
 */
export const TIER_WEEKLY_LIMITS: Record<SubscriptionTier, number> = {
  free: 10_000,
  pro: 100_000,
  max: 500_000_000,
  enterprise: 0, // No daily cap for credits
};

/**
 * Tier display names
 */
export const TIER_DISPLAY_NAMES: Record<SubscriptionTier, string> = {
  free: "Free",
  pro: "Pro",
  max: "Max",
  enterprise: "Enterprise",
};

/**
 * Tier pricing (monthly in cents)
 */
export const TIER_PRICES: Record<SubscriptionTier, number> = {
  free: 0,
  pro: 1499, // $14.99
  max: 3499, // $34.99
  enterprise: 0, // Pay-as-you-go
};

/**
 * Get tier from token limit
 */
export function getTierFromLimit(limit: number): SubscriptionTier {
  if (limit >= 1_500_000_000) return "max";
  if (limit >= 500_000) return "pro";
  return "free";
}

/**
 * Credit package token amounts
 */
export const CREDIT_AMOUNTS: Record<string, number> = {
  credits_100k: 100_000,
  credits_250k: 250_000,
  credits_600k: 600_000,
  credits_1500k: 1_500_000,
};
