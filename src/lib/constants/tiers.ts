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
  free: 1_000_000,
  pro: 10_000_000,
  max: 100_000_000,
  enterprise: 0, // Credit-based, no monthly limit
};

/**
 * Weekly token limits (monthly / 4)
 */
export const TIER_WEEKLY_LIMITS: Record<SubscriptionTier, number> = {
  free: 250_000,
  pro: 2_500_000,
  max: 25_000_000,
  enterprise: 0, // No weekly cap for credits
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
  pro: 2000, // $20
  max: 10000, // $100
  enterprise: 0, // Pay-as-you-go
};

/**
 * Get tier from token limit
 */
export function getTierFromLimit(limit: number): SubscriptionTier {
  if (limit >= 100_000_000) return "max";
  if (limit >= 10_000_000) return "pro";
  return "free";
}

/**
 * Credit package token amounts
 */
export const CREDIT_AMOUNTS: Record<string, number> = {
  credits_20m: 20_000_000,
  credits_50m: 50_000_000,
  credits_100m: 100_000_000,
  credits_500m: 500_000_000,
};
