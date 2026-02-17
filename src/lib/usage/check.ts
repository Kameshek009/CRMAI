/**
 * Usage Checking Module — Team-level billing
 *
 * All token limits are shared across the team.
 * Director pays per seat; tokens are a team pool.
 *
 * Daily Cap System:
 * - Each tier has a daily token limit (resets every 24h)
 * - If team exceeds their daily limit, all members are capped until next day
 *
 * NOTE: Field names retain "weekly" for DB/UI backward compatibility,
 * but the actual limit period is 24 hours (daily).
 */

import type { UsageCheckResult, UsageStats, SubscriptionTier } from "@/types";
import { TIER_TOKEN_LIMITS, TIER_WEEKLY_LIMITS } from "@/lib/constants/tiers";

// ============================================================================
// Team billing data shape (from Supabase teams row)
// ============================================================================

export interface TeamBillingData {
  tier: SubscriptionTier;
  token_limit: number;
  tokens_used: number;
  weekly_tokens_used: number;
  week_start_date: string;
  billing_cycle_start: string;
  seat_count: number;
}

// ============================================================================
// Team Usage Check
// ============================================================================

/**
 * Check if a team is allowed to use tokens based on tier and usage.
 */
export function checkTeamUsageAllowed(
  team: TeamBillingData,
  tokensNeeded: number
): UsageCheckResult {
  const tier = team.tier as SubscriptionTier;

  // Enterprise: unlimited
  if (tier === "enterprise") {
    return { allowed: true };
  }

  const tierLimit = TIER_TOKEN_LIMITS[tier] || TIER_TOKEN_LIMITS.free;
  const monthlyLimit = Math.max(team.token_limit, tierLimit);
  const dailyLimit = TIER_WEEKLY_LIMITS[tier] || TIER_WEEKLY_LIMITS.free;

  // Check if 24h period has rolled over
  const dayStartDate = new Date(team.week_start_date);
  const now = new Date();
  const hoursSinceDayStart =
    (now.getTime() - dayStartDate.getTime()) / (1000 * 60 * 60);

  const effectiveDailyUsed = hoursSinceDayStart >= 24 ? 0 : team.weekly_tokens_used;

  // Check daily limit
  if (effectiveDailyUsed + tokensNeeded > dailyLimit) {
    return {
      allowed: false,
      reason: "weekly_cap_exceeded",
      weeklyUsed: effectiveDailyUsed,
      weeklyLimit: dailyLimit,
      monthlyUsed: team.tokens_used,
      monthlyLimit,
      upgradeOptions: getUpgradeOptions(tier),
    };
  }

  // Check monthly limit
  if (team.tokens_used + tokensNeeded > monthlyLimit) {
    return {
      allowed: false,
      reason: "monthly_cap_exceeded",
      weeklyUsed: effectiveDailyUsed,
      weeklyLimit: dailyLimit,
      monthlyUsed: team.tokens_used,
      monthlyLimit,
      upgradeOptions: getUpgradeOptions(tier),
    };
  }

  return { allowed: true };
}

// ============================================================================
// Team Usage Stats (for UI)
// ============================================================================

/**
 * Calculate usage statistics from team billing data.
 */
export function calculateTeamUsageStats(team: TeamBillingData): UsageStats {
  const tier = team.tier as SubscriptionTier;
  const isEnterprise = tier === "enterprise";
  const tierLimit = TIER_TOKEN_LIMITS[tier] || 0;
  const monthlyLimit = Math.max(team.token_limit, tierLimit);
  const dailyLimit = TIER_WEEKLY_LIMITS[tier] || TIER_WEEKLY_LIMITS.free;

  const billingCycleStart = new Date(team.billing_cycle_start);
  const billingCycleEnd = new Date(billingCycleStart);
  billingCycleEnd.setMonth(billingCycleEnd.getMonth() + 1);

  const now = new Date();
  const msRemaining = billingCycleEnd.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

  const dayStartDate = new Date(team.week_start_date);
  const hoursSinceDayStart =
    (now.getTime() - dayStartDate.getTime()) / (1000 * 60 * 60);
  const effectiveDailyUsed = hoursSinceDayStart >= 24 ? 0 : team.weekly_tokens_used;

  const percentUsed = monthlyLimit > 0
    ? Math.min(100, (team.tokens_used / monthlyLimit) * 100)
    : 0;

  const dailyPercentUsed = dailyLimit > 0
    ? Math.min(100, (effectiveDailyUsed / dailyLimit) * 100)
    : 0;

  return {
    tokensUsed: team.tokens_used,
    tokenLimit: monthlyLimit,
    percentUsed,
    tokensRemaining: Math.max(0, monthlyLimit - team.tokens_used),
    weeklyTokensUsed: effectiveDailyUsed,
    weeklyTokenLimit: dailyLimit,
    weeklyPercentUsed: dailyPercentUsed,
    daysRemaining,
    daysIntoWeek: Math.min(Math.floor(hoursSinceDayStart), 24),
    billingCycleStart,
    billingCycleEnd,
    seatCount: team.seat_count,
    isEnterprise,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function getUpgradeOptions(currentTier: SubscriptionTier): string[] {
  const tierOrder: SubscriptionTier[] = ["free", "pro", "max"];
  const currentIndex = tierOrder.indexOf(currentTier);
  return tierOrder.slice(currentIndex + 1);
}

export function formatTokenCount(count: number): string {
  if (count >= 1_000_000) {
    const millions = count / 1_000_000;
    return millions % 1 === 0 ? `${millions}M` : `${millions.toFixed(1)}M`;
  }
  if (count >= 1_000) {
    const thousands = count / 1_000;
    return thousands % 1 === 0 ? `${thousands}K` : `${thousands.toFixed(1)}K`;
  }
  return count.toString();
}

export function getTierDisplayName(tier: SubscriptionTier): string {
  const names: Record<SubscriptionTier, string> = {
    free: "Free",
    pro: "Pro",
    max: "Max",
    enterprise: "Enterprise",
  };
  return names[tier] || tier;
}

export function getTierBadgeColor(tier: SubscriptionTier): string {
  const colors: Record<SubscriptionTier, string> = {
    free: "bg-secondary text-foreground",
    pro: "bg-secondary text-foreground",
    max: "bg-secondary text-foreground",
    enterprise: "bg-secondary text-foreground",
  };
  return colors[tier] || colors.free;
}
