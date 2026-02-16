/**
 * Usage Checking Module
 *
 * Implements daily caps and enterprise credit checking for the token system.
 *
 * Daily Cap System:
 * - Each tier has a daily token limit (resets every 24h)
 * - If user exceeds their daily limit, they're capped until next day
 * - Prevents burst usage and promotes steady consumption
 *
 * Enterprise Credits:
 * - No monthly/daily caps
 * - Uses prepaid token credits that deplete
 * - Must buy more credits when depleted
 *
 * NOTE: Some interface field names (weeklyUsed, weeklyLimit, weeklyTokensUsed, etc.)
 * retain "weekly" naming for backward compatibility with the database schema and UI
 * components, even though the actual limit period is 24 hours (daily).
 */

import type { Account, UsageCheckResult, SubscriptionTier } from "@/types";
import { TIER_TOKEN_LIMITS, TIER_WEEKLY_LIMITS } from "@/lib/constants/tiers";

/**
 * Check if a user is allowed to use tokens based on their tier and usage.
 *
 * For subscription tiers (free, pro, max):
 * - Checks daily cap (24h rolling window)
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

  // Subscription tiers use daily caps
  return checkDailyCap(account, tokensNeeded);
}

/**
 * Check daily cap for subscription tiers.
 * Uses a 24h rolling window to limit token consumption.
 */
function checkDailyCap(
  account: Account,
  tokensNeeded: number
): UsageCheckResult {
  const tierLimit = TIER_TOKEN_LIMITS[account.tier] || TIER_TOKEN_LIMITS.free;
  const monthlyLimit = Math.max(account.tokenLimit, tierLimit);
  // Daily limit from tier config (TIER_WEEKLY_LIMITS is named for legacy reasons but holds daily values)
  const dailyLimit = TIER_WEEKLY_LIMITS[account.tier] || TIER_WEEKLY_LIMITS.free;

  // Check if day has rolled over (more than 24h since the day-start timestamp)
  const dayStartDate = new Date(account.weekStartDate);
  const now = new Date();
  const hoursSinceDayStart =
    (now.getTime() - dayStartDate.getTime()) / (1000 * 60 * 60);

  // If 24+ hours have passed, daily usage resets to 0
  // account.weeklyTokensUsed stores the current day's usage (legacy field name)
  const effectiveDailyUsed = hoursSinceDayStart >= 24 ? 0 : account.weeklyTokensUsed;

  // Check daily limit
  if (effectiveDailyUsed + tokensNeeded > dailyLimit) {
    return {
      allowed: false,
      reason: "weekly_cap_exceeded", // Legacy reason name; actually means daily cap exceeded
      weeklyUsed: effectiveDailyUsed, // Legacy field name; represents daily usage
      weeklyLimit: dailyLimit, // Legacy field name; represents daily limit
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
    upgradeOptions: ["credits_100k", "credits_250k", "credits_600k", "credits_1500k"],
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
  const creditOptions = ["credits_100k", "credits_250k", "credits_600k", "credits_1500k"];

  return [...higherTiers, ...creditOptions];
}

/**
 * Calculate usage statistics from account data.
 *
 * Return field names use "weekly" prefix for backward compatibility with
 * UI components and the database schema, but the actual period is 24 hours.
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

  // Calculate hours into current 24h period
  const dayStartDate = new Date(account.weekStartDate);
  const hoursSinceDayStart =
    (now.getTime() - dayStartDate.getTime()) / (1000 * 60 * 60);

  // If 24h+ passed, effective daily usage resets to 0
  const effectiveDailyUsed = hoursSinceDayStart >= 24 ? 0 : account.weeklyTokensUsed;

  // Calculate percentages
  const percentUsed = monthlyLimit > 0
    ? Math.min(100, (account.tokensUsed / monthlyLimit) * 100)
    : 0;

  const dailyPercentUsed = dailyLimit > 0
    ? Math.min(100, (effectiveDailyUsed / dailyLimit) * 100)
    : 0;

  return {
    tokensUsed: account.tokensUsed,
    tokenLimit: monthlyLimit,
    percentUsed,
    tokensRemaining: Math.max(0, monthlyLimit - account.tokensUsed),
    weeklyTokensUsed: effectiveDailyUsed,   // Legacy name; actually daily usage
    weeklyTokenLimit: dailyLimit,            // Legacy name; actually daily limit
    weeklyPercentUsed: dailyPercentUsed,     // Legacy name; actually daily percentage
    daysRemaining,
    daysIntoWeek: Math.min(Math.floor(hoursSinceDayStart), 24), // Hours into current 24h period
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
