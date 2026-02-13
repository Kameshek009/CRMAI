"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SubscriptionTier, TIER_LIMITS } from "@/types";

interface PlanCardProps {
  tier: Exclude<SubscriptionTier, "enterprise">;
  currentTier: SubscriptionTier;
  onSelect: (tier: SubscriptionTier) => void;
  isLoading?: boolean;
  className?: string;
}

const tierConfig: Record<
  Exclude<SubscriptionTier, "enterprise">,
  {
    name: string;
    description: string;
    features: string[];
    popular?: boolean;
  }
> = {
  free: {
    name: "Free",
    description: "Perfect for trying out Serotonin",
    features: [
      "1M tokens per month",
      "Basic AI assistance",
      "Email support",
      "Standard response time",
    ],
  },
  pro: {
    name: "Pro",
    description: "For professionals who need more power",
    features: [
      "10M tokens per month",
      "Priority AI processing",
      "Priority support",
      "Advanced features",
      "Weekly cap protection",
    ],
    popular: true,
  },
  max: {
    name: "Max",
    description: "Maximum power for power users",
    features: [
      "100M tokens per month",
      "Fastest AI processing",
      "Dedicated support",
      "All Pro features",
      "Early access to new features",
    ],
  },
};

export function PlanCard({
  tier,
  currentTier,
  onSelect,
  isLoading,
  className,
}: PlanCardProps) {
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
          Most Popular
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
            {limits.priceMonthly ? "/month" : "forever"}
          </span>
        </div>

        {/* Token limit highlight */}
        <div className="rounded-xl bg-secondary p-4">
          <p className="text-sm text-muted-foreground">Includes</p>
          <p className="text-lg font-semibold mt-1">{formatTokens()} tokens/month</p>
        </div>

        {/* Features */}
        <ul className="space-y-3">
          {config.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
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
            Current Plan
          </Button>
        ) : isDowngrade ? (
          <Button variant="outline" className="w-full" disabled>
            Downgrade via Portal
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
            {isUpgrade ? `Upgrade to ${config.name}` : `Choose ${config.name}`}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
