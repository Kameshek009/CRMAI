"use client";

import { Calendar, Clock, Coins, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTokenCount, getTierDisplayName } from "@/lib/usage/check";
import { SubscriptionTier } from "@/types";
import { useTranslation } from "@/lib/i18n";

interface UsageStats {
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
  tokenCredits: number;
  isEnterprise: boolean;
}

interface UsageSummaryProps {
  stats: UsageStats;
  tier: SubscriptionTier;
  className?: string;
}

function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div
      className="w-full h-2 rounded-full bg-primary/20 overflow-hidden"
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-primary transition-all duration-300"
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  );
}

/**
 * Comprehensive usage summary showing weekly and monthly stats
 */
export function UsageSummary({ stats, tier, className }: UsageSummaryProps) {
  const { t } = useTranslation();
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Enterprise shows credits instead of limits
  if (stats.isEnterprise) {
    return (
      <div className={cn("bg-card border border-border rounded-xl", className)}>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-foreground" />
              <h3 className="font-semibold">{t("billing.usage.enterpriseCredits")}</h3>
            </div>
            <span className="text-sm text-muted-foreground">
              {t("billing.usage.noMonthlyLimits")}
            </span>
          </div>

          <div className="text-center py-6">
            <p className="text-4xl font-bold text-foreground">
              {formatTokenCount(stats.tokenCredits)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {t("billing.usage.creditsRemaining")}
            </p>
          </div>

          <div className="p-4 rounded-lg bg-secondary">
            <p className="text-sm text-muted-foreground">
              {t("billing.usage.creditsNeverExpire")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-card border border-border rounded-xl", className)}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{t("billing.usage.usageSummary")}</h3>
            <p className="text-sm text-muted-foreground">
              {getTierDisplayName(tier)} {t("billing.usage.plan")}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>{stats.daysRemaining} {t("billing.usage.daysLeft")}</span>
          </div>
        </div>

        {/* Weekly Usage */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t("billing.usage.thisWeek")}</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {t("billing.usage.dayOfWeek", { day: stats.daysIntoWeek + 1 })}
            </span>
          </div>

          <ProgressBar value={stats.weeklyPercentUsed} label="Weekly usage" />

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {formatTokenCount(stats.weeklyTokensUsed)} /{" "}
              {formatTokenCount(stats.weeklyTokenLimit)}
            </span>
            <span className="font-medium text-foreground">
              {Math.round(stats.weeklyPercentUsed)}% used
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Monthly Usage */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t("billing.usage.thisMonth")}</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {formatDate(stats.billingCycleStart)} -{" "}
              {formatDate(stats.billingCycleEnd)}
            </span>
          </div>

          <ProgressBar value={stats.percentUsed} label="Monthly usage" />

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {formatTokenCount(stats.tokensUsed)} /{" "}
              {formatTokenCount(stats.tokenLimit)}
            </span>
            <span className="font-medium text-foreground">
              {Math.round(stats.percentUsed)}% used
            </span>
          </div>
        </div>

        {/* Warning if close to weekly cap */}
        {stats.weeklyPercentUsed >= 80 && stats.weeklyPercentUsed < 100 && (
          <div className="p-3 rounded-lg bg-secondary border border-border">
            <p className="text-sm text-foreground">
              {t("billing.usage.weeklyLimitWarning")}
            </p>
          </div>
        )}

        {/* Warning if at weekly cap */}
        {stats.weeklyPercentUsed >= 100 && (
          <div className="p-3 rounded-lg bg-secondary border border-border">
            <p className="text-sm text-foreground">
              {t("billing.usage.weeklyLimitReached")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface CompactUsageProps {
  weeklyUsed: number;
  weeklyLimit: number;
  className?: string;
}

/**
 * Compact weekly usage indicator for headers/sidebars
 */
export function CompactUsage({
  weeklyUsed,
  weeklyLimit,
  className,
}: CompactUsageProps) {
  const percentage = Math.min(100, (weeklyUsed / weeklyLimit) * 100);

  const getColor = () => {
    return "bg-foreground";
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="w-24 h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", getColor())}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground">
        {formatTokenCount(weeklyUsed)}/{formatTokenCount(weeklyLimit)}
      </span>
    </div>
  );
}
