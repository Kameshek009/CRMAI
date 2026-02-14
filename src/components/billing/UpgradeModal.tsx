"use client";

import React from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Zap, Building2, Clock, AlertTriangle, ArrowRight } from "lucide-react";

export type UpgradeReason =
  | "weekly_cap_exceeded"
  | "monthly_cap_exceeded"
  | "insufficient_credits"
  | "approaching_limit";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason: UpgradeReason;
  currentTier?: string;
  weeklyUsed?: number;
  weeklyLimit?: number;
  monthlyUsed?: number;
  monthlyLimit?: number;
  creditsRemaining?: number;
}

const plans = [
  {
    tier: "pro",
    name: "Pro",
    price: "$20",
    tokens: "10M",
    description: "Perfect for regular users",
    icon: Sparkles,
  },
  {
    tier: "max",
    name: "Max",
    price: "$100",
    tokens: "100M",
    description: "For power users",
    icon: Zap,
  },
  {
    tier: "enterprise",
    name: "Credits",
    price: "From $20",
    tokens: "Pay as you go",
    description: "Buy tokens when you need them",
    icon: Building2,
  },
];

function getReasonTitle(reason: UpgradeReason): string {
  switch (reason) {
    case "weekly_cap_exceeded":
      return "Weekly Limit Reached";
    case "monthly_cap_exceeded":
      return "Monthly Limit Reached";
    case "insufficient_credits":
      return "Credits Depleted";
    case "approaching_limit":
      return "Approaching Your Limit";
    default:
      return "Upgrade Your Plan";
  }
}

function getReasonDescription(reason: UpgradeReason): string {
  switch (reason) {
    case "weekly_cap_exceeded":
      return "You've used your weekly token allocation. Upgrade for more tokens or wait until next week.";
    case "monthly_cap_exceeded":
      return "You've used all your tokens for this month. Upgrade to continue using NexusCRM.";
    case "insufficient_credits":
      return "Your token credits have run out. Purchase more credits to continue.";
    case "approaching_limit":
      return "You're running low on tokens. Consider upgrading for uninterrupted usage.";
    default:
      return "Upgrade to unlock more tokens and features.";
  }
}

function getReasonIcon(reason: UpgradeReason) {
  switch (reason) {
    case "weekly_cap_exceeded":
    case "monthly_cap_exceeded":
      return <Clock className="size-5 text-warning" />;
    case "insufficient_credits":
    case "approaching_limit":
      return <AlertTriangle className="size-5 text-warning" />;
    default:
      return <Sparkles className="size-5 text-primary" />;
  }
}

export function UpgradeModal({
  isOpen,
  onClose,
  reason,
  currentTier = "free",
  weeklyUsed,
  weeklyLimit,
  monthlyUsed,
  monthlyLimit,
}: UpgradeModalProps) {
  const availablePlans = plans.filter((plan) => {
    if (currentTier === "free") return true;
    if (currentTier === "pro") return plan.tier !== "pro";
    if (currentTier === "max") return plan.tier === "enterprise";
    return plan.tier === "enterprise";
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
              {getReasonIcon(reason)}
            </div>
            <div>
              <DialogTitle>{getReasonTitle(reason)}</DialogTitle>
              <DialogDescription className="mt-1">
                {getReasonDescription(reason)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Usage Status */}
          {(weeklyUsed !== undefined || monthlyUsed !== undefined) && (
            <div className="rounded-lg bg-secondary p-4 space-y-3">
              <p className="text-sm font-medium">Current Usage</p>
              {weeklyUsed !== undefined && weeklyLimit !== undefined && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Weekly</span>
                    <span>
                      {(weeklyUsed / 1_000_000).toFixed(1)}M / {(weeklyLimit / 1_000_000).toFixed(1)}M
                    </span>
                  </div>
                  <Progress value={Math.min((weeklyUsed / weeklyLimit) * 100, 100)} className="h-2" />
                </div>
              )}
              {monthlyUsed !== undefined && monthlyLimit !== undefined && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Monthly</span>
                    <span>
                      {(monthlyUsed / 1_000_000).toFixed(1)}M / {(monthlyLimit / 1_000_000).toFixed(1)}M
                    </span>
                  </div>
                  <Progress value={Math.min((monthlyUsed / monthlyLimit) * 100, 100)} className="h-2" />
                </div>
              )}
            </div>
          )}

          {/* Upgrade Options */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Upgrade Options</p>
            {availablePlans.map((plan) => {
              const Icon = plan.icon;
              return (
                <Card key={plan.tier} className="cursor-pointer hover:bg-accent transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-lg bg-secondary">
                          <Icon className="size-5" />
                        </div>
                        <div>
                          <div className="flex items-baseline gap-2">
                            <span className="font-medium">{plan.name}</span>
                            <span className="text-sm text-muted-foreground">
                              {plan.price}/mo
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {plan.tokens} tokens - {plan.description}
                          </p>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" asChild onClick={onClose}>
                        <Link href="/dashboard/account/billing">
                          Upgrade
                          <ArrowRight className="ml-1 size-3" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          {reason === "weekly_cap_exceeded" && (
            <p className="text-xs text-muted-foreground self-center">
              Weekly limit resets in a few days
            </p>
          )}
          <Button variant="ghost" onClick={onClose} className="ml-auto">
            {reason === "weekly_cap_exceeded" ? "Wait for reset" : "Maybe later"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function useUpgradeModal() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [modalProps, setModalProps] = React.useState<Omit<UpgradeModalProps, "isOpen" | "onClose">>({
    reason: "weekly_cap_exceeded",
  });

  const showUpgradeModal = (props: Omit<UpgradeModalProps, "isOpen" | "onClose">) => {
    setModalProps(props);
    setIsOpen(true);
  };

  const closeUpgradeModal = () => {
    setIsOpen(false);
  };

  return {
    isOpen,
    modalProps,
    showUpgradeModal,
    closeUpgradeModal,
  };
}
