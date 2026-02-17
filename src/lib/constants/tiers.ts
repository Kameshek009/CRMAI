/**
 * Tier Constants
 *
 * Per-seat team billing configuration.
 * Token limits are shared across the entire team.
 */

import type { SubscriptionTier } from "@/types";

/**
 * Token limits per tier (monthly, shared across team)
 */
export const TIER_TOKEN_LIMITS: Record<SubscriptionTier, number> = {
  free: 50_000,
  pro: 500_000,
  max: 1_500_000,
  enterprise: 0, // Unlimited
};

/**
 * Daily token limits per team (resets every 24h)
 */
export const TIER_WEEKLY_LIMITS: Record<SubscriptionTier, number> = {
  free: 10_000,
  pro: 100_000,
  max: 300_000,
  enterprise: 0, // No daily cap
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
 * Per-seat pricing (monthly in cents)
 */
export const TIER_SEAT_PRICES: Record<SubscriptionTier, number> = {
  free: 0,
  pro: 1499, // $14.99/seat/mo
  max: 3499, // $34.99/seat/mo
  enterprise: 0, // Custom pricing
};

/** @deprecated Use TIER_SEAT_PRICES */
export const TIER_PRICES = TIER_SEAT_PRICES;

/**
 * Max team members per tier
 */
export const TIER_MAX_MEMBERS: Record<SubscriptionTier, number> = {
  free: 3,
  pro: 5000,
  max: 5000,
  enterprise: 5000,
};

/**
 * Get tier from token limit
 */
export function getTierFromLimit(limit: number): SubscriptionTier {
  if (limit >= 1_500_000) return "max";
  if (limit >= 500_000) return "pro";
  return "free";
}
