"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerBillingCard, InvoiceHistory } from "@/components/billing";
import { Check, Crown, AlertTriangle, ArrowRight } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import type { UsageStats } from "@/types";
import type { CustomerBillingInfoData, InvoiceInfo } from "@/components/billing";

interface TeamInfo {
  id: string;
  name: string;
  tier: string;
  seatCount: number;
  isDirector: boolean;
}

interface BillingData {
  team: TeamInfo;
  usageStats: UsageStats;
  paymentHistory: unknown[];
  stripeBilling: CustomerBillingInfoData | null;
}

function getTierInfo(tier: string): { name: string; variant: "default" | "secondary" | "outline" } {
  switch (tier) {
    case "free":
      return { name: "Free", variant: "secondary" };
    case "pro":
      return { name: "Pro", variant: "default" };
    case "max":
      return { name: "Max", variant: "default" };
    case "enterprise":
      return { name: "Enterprise", variant: "default" };
    default:
      return { name: tier, variant: "secondary" };
  }
}

function formatTokens(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(0)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K`;
  return count.toLocaleString();
}

export function BillingSection() {
  const { t } = useTranslation();
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBillingData() {
      try {
        const response = await fetch("/api/billing/account");
        const data = await response.json();
        if (data.success) {
          setBillingData(data.data);
        } else {
          setError(data.error || t("common.error"));
        }
      } catch {
        setError(t("common.error"));
      } finally {
        setIsLoading(false);
      }
    }
    fetchBillingData();
  }, [t]);

  const tierInfo = billingData ? getTierInfo(billingData.team.tier) : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t("settings.billing.title")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t("settings.billing.description")}</p>
      </div>
      <Separator />

      {/* Current Plan */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="size-4" />
          <p className="text-sm">{error}</p>
        </div>
      ) : billingData && tierInfo ? (
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl font-semibold">{tierInfo.name}</span>
              {tierInfo.name !== "Free" && (
                <Crown className="size-4 text-yellow-500" />
              )}
              <Badge variant="outline" className="ml-1">
                <Check className="mr-1 size-3" />
                {t("settings.billing.active")}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {billingData.team.tier === "enterprise"
                ? t("settings.billing.unlimited")
                : t("settings.billing.tokensPerMonth", { count: formatTokens(billingData.usageStats.tokenLimit) })}
            </p>
          </div>
          {billingData.team.tier === "free" ? (
            <Button asChild>
              <Link href="/dashboard/account/billing">
                {t("settings.billing.upgrade")}
                <ArrowRight className="ml-1 size-3" />
              </Link>
            </Button>
          ) : (
            <Button variant="outline" asChild>
              <Link href="/dashboard/account/billing">
                {t("settings.billing.managePlan")}
              </Link>
            </Button>
          )}
        </div>
      ) : null}

      {/* Stripe Billing Details */}
      {!isLoading && billingData && (
        <CustomerBillingCard
          billingInfo={billingData.stripeBilling}
          isLoading={isLoading}
        />
      )}

      {/* Invoice History */}
      {!isLoading && billingData?.stripeBilling?.invoices && (
        <InvoiceHistory
          invoices={billingData.stripeBilling.invoices as InvoiceInfo[]}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
