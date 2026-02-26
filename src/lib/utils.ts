import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format number with commas
 */
export function formatNumber(num: number, locale = "en-US"): string {
  return new Intl.NumberFormat(locale).format(num);
}

/**
 * Format number as compact (e.g., 10K, 1M)
 */
export function formatCompact(num: number, locale = "en-US"): string {
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    compactDisplay: "short",
  }).format(num);
}

/**
 * Format currency
 */
export function formatCurrency(amount: number, locale = "en-US", currency = "USD"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Calculate percentage
 */
export function calculatePercentage(used: number, total: number): number {
  if (total === 0) return 0;
  return Math.min(Math.round((used / total) * 100), 100);
}

/**
 * Format relative time
 */
export function formatRelativeTime(date: Date, locale = "en-US"): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
  });
}

/**
 * Get days remaining in billing cycle
 */
export function getDaysRemaining(billingCycleStart: Date): number {
  const now = new Date();
  const cycleEnd = new Date(billingCycleStart);
  cycleEnd.setMonth(cycleEnd.getMonth() + 1);

  const diff = cycleEnd.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Get billing cycle end date
 */
export function getBillingCycleEnd(billingCycleStart: Date): Date {
  const cycleEnd = new Date(billingCycleStart);
  cycleEnd.setMonth(cycleEnd.getMonth() + 1);
  return cycleEnd;
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get tier color
 */
export function getTierColor(tier: string): string {
  switch (tier) {
    case "free":
      return "default";
    case "pro":
      return "primary";
    case "max":
      return "secondary";
    case "enterprise":
      return "warning";
    default:
      return "default";
  }
}

/**
 * Get status color
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case "active":
      return "success";
    case "completed":
      return "default";
    case "error":
      return "danger";
    default:
      return "default";
  }
}
