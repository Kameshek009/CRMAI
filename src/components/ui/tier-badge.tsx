"use client";

import { cn } from "@/lib/utils";
import { SubscriptionTier } from "@/types";

interface TierBadgeProps {
  tier: SubscriptionTier;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const tierConfig: Record<SubscriptionTier, {
  label: string;
}> = {
  free: { label: "Free" },
  pro: { label: "Pro" },
  max: { label: "Max" },
  enterprise: { label: "Enterprise" },
};

export function TierBadge({ tier, size = "md", className }: TierBadgeProps) {
  const config = tierConfig[tier];

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-xs px-2.5 py-1",
    lg: "text-sm px-3 py-1",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full",
        "bg-secondary text-foreground",
        sizeClasses[size],
        className
      )}
    >
      {config.label}
    </span>
  );
}
