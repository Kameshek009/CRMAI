/**
 * Usage Checking Module
 *
 * Implements weekly caps and enterprise credit checking for the token system.
 *
 * Weekly Cap System:
 * - Monthly limit is divided into 4 weekly portions
 * - If user exceeds their weekly portion, they're capped until next week
 * - Prevents burst usage and promotes steady consumption
 *
 * Enterprise Credits:
 * - No monthly/weekly caps
 * - Uses prepaid token credits that deplete
 * - Must buy more credits when depleted
 */

import type { Account, UsageCheckResult, SubscriptionTier } from "@/types";
import { TIER_TOKEN_LIMITS, TIER_WEEKLY_LIMITS } from "@/lib/constants/tiers";

/**
 * Check if a user is allowed to use tokens based on their tier and usage.
 *
 * For subscription tiers (free, pro, max):
 * - Checks weekly cap (monthly_limit / 4)
 * - Returns upgrade options if capped
 *
 * For enterprise tier:
 * - Checks credit balance
 * - Returns credit package options if depleted
 */
export function checkUsageAllowed(
  account: Account,
  tokensNeeded: number
): UsageCheckResult {
  // Enterprise tier uses credits, not caps
  if (account.tier === "enterprise") {
    return checkEnterpriseCredits(account, tokensNeeded);
  }

  // Subscription tiers use weekly caps
  return checkWeeklyCap(account, tokensNeeded);
}

/**
 * Check weekly cap for subscription tiers
 */
function checkWeeklyCap(
  account: Account,
  tokensNeeded: number
): UsageCheckResult {
  const tierLimit = TIER_TOKEN_LIMITS[account.tier] || TIER_TOKEN_LIMITS.free;
  const monthlyLimit = Math.max(account.tokenLimit, tierLimit);
  // Daily limit from tier config (stored in weeklyTokenLimit field)
  const dailyLimit = TIER_WEEKLY_LIMITS[account.tier] || TIER_WEEKLY_LIMITS.free;

  // Check if day has rolled over (more than 24h since week_start_date)
  const dayStartDate = new Date(account.weekStartDate);
  const now = new Date();
  const hoursSinceDayStart =
    (now.getTime() - dayStartDate.getTime()) / (1000 * 60 * 60);

  // If 24+ hours have passed, daily usage should be 0
  let effectiveDailyUsed = account.weeklyTokensUsed;
  if (hoursSinceDayStart >= 24) {
    effectiveDailyUsed = 0;
  }

  // Check daily limit
  if (effectiveDailyUsed + tokensNeeded > dailyLimit) {
    return {
      allowed: false,
      reason: "weekly_cap_exceeded",
      weeklyUsed: effectiveDailyUsed,
      weeklyLimit: dailyLimit,
      monthlyUsed: account.tokensUsed,
      monthlyLimit,
      upgradeOptions: getUpgradeOptions(account.tier),
    };
  }

  // Also check monthly limit
  if (account.tokensUsed + tokensNeeded > monthlyLimit) {
    return {
      allowed: false,
      reason: "monthly_cap_exceeded",
      weeklyUsed: effectiveDailyUsed,
      weeklyLimit: dailyLimit,
      monthlyUsed: account.tokensUsed,
      monthlyLimit,
      upgradeOptions: getUpgradeOptions(account.tier),
    };
  }

  return { allowed: true };
}

/**
 * Check credit balance for enterprise tier
 */
function checkEnterpriseCredits(
  account: Account,
  tokensNeeded: number
): UsageCheckResult {
  const credits = account.tokenCredits || 0;

  if (credits >= tokensNeeded) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: "insufficient_credits",
    creditsRemaining: credits,
    upgradeOptions: ["credits_20m", "credits_50m", "credits_100m", "credits_500m"],
  };
}

/**
 * Get upgrade options for a given tier
 */
function getUpgradeOptions(currentTier: SubscriptionTier): string[] {
  const tierOrder = ["free", "pro", "max", "enterprise"];
  const currentIndex = tierOrder.indexOf(currentTier);

  // Return higher tiers plus credit packages
  const higherTiers = tierOrder.slice(currentIndex + 1).filter(t => t !== "enterprise");

  // Always offer credit packages as an option
  const creditOptions = ["credits_20m", "credits_50m", "credits_100m", "credits_500m"];

  return [...higherTiers, ...creditOptions];
}

/**
 * Calculate usage statistics from account data
 */
export function calculateUsageStats(account: Account) {
  const isEnterprise = account.tier === "enterprise";
  const tierLimit = TIER_TOKEN_LIMITS[account.tier] || 0;
  const monthlyLimit = Math.max(account.tokenLimit, tierLimit);
  const dailyLimit = TIER_WEEKLY_LIMITS[account.tier] || TIER_WEEKLY_LIMITS.free;

  // Calculate billing cycle end
  const billingCycleStart = new Date(account.billingCycleStart);
  const billingCycleEnd = new Date(billingCycleStart);
  billingCycleEnd.setMonth(billingCycleEnd.getMonth() + 1);

  // Calculate days remaining in billing cycle
  const now = new Date();
  const msRemaining = billingCycleEnd.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

  // Calculate hours into current day period (24h cycle)
  const dayStartDate = new Date(account.weekStartDate);
  const hoursSinceDayStart =
    (now.getTime() - dayStartDate.getTime()) / (1000 * 60 * 60);

  // If 24h+ passed, effective daily usage is 0
  const effectiveDailyUsed = hoursSinceDayStart >= 24 ? 0 : account.weeklyTokensUsed;

  // Calculate percentages
  const percentUsed = monthlyLimit > 0
    ? Math.min(100, (account.tokensUsed / monthlyLimit) * 100)
    : 0;

  const weeklyPercentUsed = dailyLimit > 0
    ? Math.min(100, (effectiveDailyUsed / dailyLimit) * 100)
    : 0;

  return {
    tokensUsed: account.tokensUsed,
    tokenLimit: monthlyLimit,
    percentUsed,
    tokensRemaining: Math.max(0, monthlyLimit - account.tokensUsed),
    weeklyTokensUsed: effectiveDailyUsed,
    weeklyTokenLimit: dailyLimit,
    weeklyPercentUsed,
    daysRemaining,
    daysIntoWeek: Math.min(Math.floor(hoursSinceDayStart), 24),
    billingCycleStart,
    billingCycleEnd,
    tokenCredits: account.tokenCredits || 0,
    isEnterprise,
  };
}

/**
 * Format token count for display (e.g., "1.5M", "500K")
 */
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

/**
 * Get tier display name
 */
export function getTierDisplayName(tier: SubscriptionTier): string {
  const names: Record<SubscriptionTier, string> = {
    free: "Free",
    pro: "Pro",
    max: "Max",
    enterprise: "Enterprise",
  };
  return names[tier] || tier;
}

/**
 * Get tier badge color class
 */
export function getTierBadgeColor(tier: SubscriptionTier): string {
  const colors: Record<SubscriptionTier, string> = {
    free: "bg-secondary text-foreground",
    pro: "bg-secondary text-foreground",
    max: "bg-secondary text-foreground",
    enterprise: "bg-secondary text-foreground",
  };
  return colors[tier] || colors.free;
}
