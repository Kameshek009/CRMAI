"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { SubscriptionTier, TIER_LIMITS } from "@/types";

interface PlanCardProps {
  tier: Exclude<SubscriptionTier, "enterprise">;
  currentTier: SubscriptionTier;
  onSelect: (tier: SubscriptionTier) => void;
  isLoading?: boolean;
  className?: string;
}

function getTierConfig(t: (key: string, params?: Record<string, string | number>) => string): Record<
  Exclude<SubscriptionTier, "enterprise">,
  {
    name: string;
    description: string;
    features: string[];
    popular?: boolean;
  }
> {
  return {
    free: {
      name: t("billing.plans.free"),
      description: t("billing.plans.freeDescription"),
      features: [
        t("billing.features.tokensPerMonth", { count: "50K" }),
        t("billing.features.tokensDayLimit", { count: "10K" }),
        t("billing.features.basicAi"),
        t("billing.features.emailSupport"),
      ],
    },
    pro: {
      name: t("billing.plans.pro"),
      description: t("billing.plans.proDescription"),
      features: [
        t("billing.features.tokensPerMonth", { count: "500K" }),
        t("billing.features.tokensDayLimit", { count: "100K" }),
        t("billing.features.priorityAi"),
        t("billing.features.prioritySupport"),
        t("billing.features.advancedFeatures"),
      ],
      popular: true,
    },
    max: {
      name: t("billing.plans.max"),
      description: t("billing.plans.maxDescription"),
      features: [
        t("billing.features.tokensPerMonth", { count: "1.5M" }),
        t("billing.features.tokensDayLimit", { count: "300K" }),
        t("billing.features.fastestAi"),
        t("billing.features.dedicatedSupport"),
        t("billing.features.allProFeatures"),
      ],
    },
  };
}

export function PlanCard({
  tier,
  currentTier,
  onSelect,
  isLoading,
  className,
}: PlanCardProps) {
  const { t } = useTranslation();
  const tierConfig = getTierConfig(t);
  const config = tierConfig[tier];
  const limits = TIER_LIMITS[tier];

  const isCurrent = currentTier === tier;
  const isDowngrade =
    ["pro", "max"].indexOf(tier) < ["pro", "max"].indexOf(currentTier) &&
    currentTier !== "free" &&
    currentTier !== "enterprise";
  const isUpgrade =
    ["free", "pro", "max"].indexOf(tier) >
    ["free", "pro", "max"].indexOf(currentTier);

  const formatPrice = () => {
    if (!limits.priceMonthly) return "$0";
    return `$${limits.priceMonthly}`;
  };

  const formatTokens = () => {
    const monthly = limits.monthlyTokenLimit;
    if (monthly >= 1_000_000) {
      return `${monthly / 1_000_000}M`;
    }
    return `${monthly / 1_000}K`;
  };

  return (
    <Card
      className={cn(
        "relative flex flex-col",
        isCurrent && "ring-2 ring-primary",
        config.popular && !isCurrent && "ring-1 ring-primary/50",
        className
      )}
    >
      {config.popular && (
        <Badge
          className="absolute -top-2.5 left-1/2 -translate-x-1/2"
          variant="default"
        >
          {t("billing.planCard.mostPopular")}
        </Badge>
      )}

      <CardHeader>
        <CardTitle className="text-lg">{config.name}</CardTitle>
        <CardDescription>{config.description}</CardDescription>
      </CardHeader>

      <CardContent className="flex-1 space-y-6">
        {/* Pricing */}
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">{formatPrice()}</span>
          <span className="text-muted-foreground">
            {limits.priceMonthly ? t("billing.planCard.perSeatMonth") : t("billing.planCard.forever")}
          </span>
        </div>

        {/* Token limit highlight */}
        <div className="rounded-xl bg-secondary p-4">
          <p className="text-sm text-muted-foreground">{t("billing.planCard.includes")}</p>
          <p className="text-lg font-semibold mt-1">{formatTokens()} {t("billing.planCard.tokensMonth")}</p>
        </div>

        {/* Features */}
        <ul className="space-y-3">
          {config.features.map((feature) => (
            <li key={feature} className="flex items-start gap-3">
              <Check className="size-4 text-primary mt-0.5 shrink-0" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
        {isCurrent ? (
          <Button variant="outline" className="w-full" disabled>
            <Check className="mr-2 size-4" />
            {t("billing.planCard.currentPlan")}
          </Button>
        ) : isDowngrade ? (
          <Button variant="outline" className="w-full" disabled>
            {t("billing.planCard.downgradeViaPortal")}
          </Button>
        ) : (
          <Button
            className="w-full"
            onClick={() => onSelect(tier)}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : null}
            {isUpgrade ? t("billing.planCard.upgradeTo", { plan: config.name }) : t("billing.planCard.choose", { plan: config.name })}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
