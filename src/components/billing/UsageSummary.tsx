"use client";

import { Card, CardBody, Progress } from "@heroui/react";
import { Calendar, Clock, Coins, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTokenCount, getTierDisplayName } from "@/lib/usage/check";
import { SubscriptionTier } from "@/types";

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

/**
 * Comprehensive usage summary showing weekly and monthly stats
 */
export function UsageSummary({ stats, tier, className }: UsageSummaryProps) {
  const getProgressColor = (_percent?: number): "default" => {
    return "default";
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Enterprise shows credits instead of limits
  if (stats.isEnterprise) {
    return (
      <Card
        className={cn("bg-card rounded-xl", className)}
        shadow="none"
      >
        <CardBody className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-foreground" />
              <h3 className="font-semibold">Enterprise Credits</h3>
            </div>
            <span className="text-sm text-muted-foreground">
              No monthly limits
            </span>
          </div>

          <div className="text-center py-6">
            <p className="text-4xl font-bold text-foreground">
              {formatTokenCount(stats.tokenCredits)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              credits remaining
            </p>
          </div>

          <div className="p-4 rounded-lg bg-secondary">
            <p className="text-sm text-muted-foreground">
              Credits never expire. Purchase more when you need them.
            </p>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card
      className={cn("bg-card rounded-xl", className)}
      shadow="none"
    >
      <CardBody className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Usage Summary</h3>
            <p className="text-sm text-muted-foreground">
              {getTierDisplayName(tier)} Plan
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>{stats.daysRemaining} days left</span>
          </div>
        </div>

        {/* Weekly Usage */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">This Week</span>
            </div>
            <span className="text-sm text-muted-foreground">
              Day {stats.daysIntoWeek + 1} of 7
            </span>
          </div>

          <Progress
            value={stats.weeklyPercentUsed}
            color={getProgressColor(stats.weeklyPercentUsed)}
            className="h-2"
            aria-label="Weekly usage"
          />

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
              <span className="text-sm font-medium">This Month</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {formatDate(stats.billingCycleStart)} -{" "}
              {formatDate(stats.billingCycleEnd)}
            </span>
          </div>

          <Progress
            value={stats.percentUsed}
            color={getProgressColor()}
            className="h-2"
            aria-label="Monthly usage"
          />

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
              You&apos;re approaching your weekly limit. Consider upgrading for more
              capacity.
            </p>
          </div>
        )}

        {/* Warning if at weekly cap */}
        {stats.weeklyPercentUsed >= 100 && (
          <div className="p-3 rounded-lg bg-secondary border border-border">
            <p className="text-sm text-foreground">
              Weekly limit reached. Upgrade your plan or wait for next week to
              continue.
            </p>
          </div>
        )}
      </CardBody>
    </Card>
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
