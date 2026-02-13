"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Loader2, CreditCard, Zap, ExternalLink } from "lucide-react";
import {
  PlanCard,
  CreditPackageGrid,
  BillingHistory,
  ManageSubscriptionButton,
} from "@/components/billing";
import type { Account, PaymentHistory, SubscriptionTier } from "@/types";

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
  billingCycleStart: string;
  billingCycleEnd: string;
  tokenCredits: number;
  isEnterprise: boolean;
}

interface BillingData {
  account: Account;
  usageStats: UsageStats;
  paymentHistory: PaymentHistory[];
}

type PageState = "loading" | "ready" | "error";

function parseUpgradeParam(upgrade: string | null): {
  type: "subscription" | "credits";
  itemId: string;
} | null {
  if (!upgrade) return null;

  if (upgrade.startsWith("credits_")) {
    return { type: "credits", itemId: upgrade };
  }

  if (upgrade === "pro" || upgrade === "max") {
    return { type: "subscription", itemId: upgrade };
  }

  return null;
}

function BillingPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<PageState>("loading");
  const [data, setData] = useState<BillingData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [urlParamProcessed, setUrlParamProcessed] = useState(false);
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const redirectToCheckout = async (type: "subscription" | "credits", itemId: string) => {
    try {
      setLoadingTier(itemId);
      setError(null);

      const endpoint =
        type === "subscription"
          ? "/api/billing/checkout/subscription"
          : "/api/billing/checkout/credits";

      const body =
        type === "subscription"
          ? { tier: itemId, hosted: true }
          : { packageId: itemId, hosted: true };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to create checkout session");
      }

      if (result.data.upgraded) {
        window.location.reload();
        return;
      }

      if (result.data.url) {
        window.location.href = result.data.url;
      }
    } catch (err) {
      console.error("Checkout error:", err);
      setError(err instanceof Error ? err.message : "Checkout failed");
      setLoadingTier(null);
    }
  };

  useEffect(() => {
    if (urlParamProcessed || state !== "ready") return;

    const upgradeParam = searchParams.get("upgrade");
    const parsed = parseUpgradeParam(upgradeParam);

    if (parsed) {
      redirectToCheckout(parsed.type, parsed.itemId);
      setUrlParamProcessed(true);

      const url = new URL(window.location.href);
      url.searchParams.delete("upgrade");
      router.replace(url.pathname + url.search, { scroll: false });
    }
  }, [searchParams, state, urlParamProcessed, router]);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/billing/account");
        const result = await response.json();

        if (result.success) {
          setData(result.data);
          setState("ready");
        } else {
          setError(result.error);
          setState("error");
        }
      } catch {
        setError("Failed to load billing data");
        setState("error");
      }
    }

    fetchData();
  }, []);

  const handleSubscriptionSelect = (tier: SubscriptionTier) => {
    if (tier === "enterprise") return;
    redirectToCheckout("subscription", tier);
  };

  const handleCreditPurchase = (packageId: string) => {
    redirectToCheckout("credits", packageId);
  };

  // Loading state
  if (state === "loading") {
    return (
      <PageContainer>
        <PageHeader title="Billing" description="Manage your subscription and payments" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-8">
                <Skeleton className="h-48 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </PageContainer>
    );
  }

  // Error state
  if (state === "error" || !data) {
    return (
      <PageContainer>
        <PageHeader title="Billing" description="Manage your subscription and payments" />
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <AlertCircle className="size-14 text-destructive" />
              <div className="mt-6 space-y-2">
                <h2 className="text-xl font-semibold">Failed to Load Billing</h2>
                <p className="text-muted-foreground max-w-sm">
                  {error || "An unexpected error occurred"}
                </p>
              </div>
              <Button
                variant="outline"
                className="mt-6 h-11"
                onClick={() => window.location.reload()}
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  const { account, usageStats } = data;

  const formatTokens = (count: number) => {
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return count.toLocaleString();
  };

  return (
    <PageContainer>
      <PageHeader title="Billing" description="Manage your subscription and payments">
        <ManageSubscriptionButton customerId={account.stripeCustomerId ?? null} />
      </PageHeader>

      {/* Current Plan Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-3">
                <CreditCard className="size-5" />
                Current Plan
              </CardTitle>
              <CardDescription>
                Your subscription and usage for this billing period
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-1.5 capitalize">
              {account.tier}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Tokens Used</p>
              <p className="text-2xl font-bold">{formatTokens(usageStats.tokensUsed)}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Monthly Limit</p>
              <p className="text-2xl font-bold">{formatTokens(usageStats.tokenLimit)}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Days Remaining</p>
              <p className="text-2xl font-bold">{usageStats.daysRemaining}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{usageStats.percentUsed.toFixed(1)}% used</span>
              <span>{formatTokens(usageStats.tokensRemaining)} remaining</span>
            </div>
            <Progress value={usageStats.percentUsed} className="h-2.5" />
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="size-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscription Plans */}
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Subscription Plans</h2>
          <p className="text-muted-foreground">
            Choose the plan that works best for you
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <PlanCard
            tier="free"
            currentTier={account.tier}
            onSelect={handleSubscriptionSelect}
            isLoading={loadingTier === "free"}
          />
          <PlanCard
            tier="pro"
            currentTier={account.tier}
            onSelect={handleSubscriptionSelect}
            isLoading={loadingTier === "pro"}
          />
          <PlanCard
            tier="max"
            currentTier={account.tier}
            onSelect={handleSubscriptionSelect}
            isLoading={loadingTier === "max"}
          />
        </div>
      </div>

      {/* Credit Packages */}
      <CreditPackageGrid onPurchase={handleCreditPurchase} loadingPackageId={loadingTier} />

      {/* Billing History */}
      <BillingHistory payments={data.paymentHistory} />
    </PageContainer>
  );
}

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <PageHeader title="Billing" description="Manage your subscription and payments" />
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        </PageContainer>
      }
    >
      <BillingPageContent />
    </Suspense>
  );
}
