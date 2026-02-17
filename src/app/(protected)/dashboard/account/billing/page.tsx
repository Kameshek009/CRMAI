"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Loader2, CreditCard, Users } from "lucide-react";
import {
  PlanCard,
  BillingHistory,
  ManageSubscriptionButton,
} from "@/components/billing";
import type { PaymentHistory, SubscriptionTier } from "@/types";
import { TIER_LIMITS } from "@/types";

interface UsageStats {
  tokensUsed: number;
  tokenLimit: number;
  percentUsed: number;
  tokensRemaining: number;
  weeklyTokensUsed: number;
  weeklyTokenLimit: number;
  weeklyPercentUsed: number;
  daysRemaining: number;
  seatCount: number;
  isEnterprise: boolean;
}

interface TeamBillingInfo {
  id: string;
  name: string;
  tier: SubscriptionTier;
  seatCount: number;
  isDirector: boolean;
}

interface BillingData {
  team: TeamBillingInfo;
  usageStats: UsageStats;
  paymentHistory: PaymentHistory[];
}

type PageState = "loading" | "ready" | "error";

function BillingPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<PageState>("loading");
  const [data, setData] = useState<BillingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [urlParamProcessed, setUrlParamProcessed] = useState(false);
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const redirectToCheckout = async (tier: string) => {
    try {
      setLoadingTier(tier);
      setError(null);

      const response = await fetch("/api/billing/checkout/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, hosted: true }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to create checkout session");
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
    if (upgradeParam && (upgradeParam === "pro" || upgradeParam === "max")) {
      redirectToCheckout(upgradeParam);
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
    if (tier === "enterprise" || tier === "free") return;
    redirectToCheckout(tier);
  };

  if (state === "loading") {
    return (
      <PageContainer>
        <PageHeader title="Billing" description="Manage your team subscription and payments" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  if (state === "error" || !data) {
    return (
      <PageContainer>
        <PageHeader title="Billing" description="Manage your team subscription and payments" />
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

  const { team, usageStats } = data;
  const tierLimits = TIER_LIMITS[team.tier];
  const perSeatPrice = tierLimits.priceMonthly;
  const totalMonthly = perSeatPrice * team.seatCount;

  const formatTokens = (count: number) => {
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return count.toLocaleString();
  };

  return (
    <PageContainer>
      <PageHeader title="Billing" description={`Team: ${team.name}`}>
        {team.isDirector && (
          <ManageSubscriptionButton customerId={null} />
        )}
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
                {team.isDirector
                  ? "Your team subscription and usage"
                  : "Team subscription (managed by director)"}
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-1.5 capitalize">
              {team.tier}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Tokens Used</p>
              <p className="text-2xl font-bold">{formatTokens(usageStats.tokensUsed)}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Monthly Limit</p>
              <p className="text-2xl font-bold">{formatTokens(usageStats.tokenLimit)}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Users className="size-3.5" />
                Seats
              </p>
              <p className="text-2xl font-bold">{team.seatCount}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Days Remaining</p>
              <p className="text-2xl font-bold">{usageStats.daysRemaining}</p>
            </div>
          </div>

          {/* Per-seat cost breakdown */}
          {team.tier !== "free" && team.isDirector && (
            <div className="rounded-xl bg-secondary p-4">
              <p className="text-sm text-muted-foreground">Monthly Cost</p>
              <p className="text-lg font-semibold mt-1">
                {team.seatCount} seats × ${perSeatPrice}/seat = ${totalMonthly.toFixed(2)}/mo
              </p>
            </div>
          )}

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

      {/* Subscription Plans — only for directors */}
      {team.isDirector && (
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Subscription Plans</h2>
            <p className="text-muted-foreground">
              Per-seat pricing — you pay for each member in your team
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <PlanCard
              tier="free"
              currentTier={team.tier}
              onSelect={handleSubscriptionSelect}
              isLoading={loadingTier === "free"}
            />
            <PlanCard
              tier="pro"
              currentTier={team.tier}
              onSelect={handleSubscriptionSelect}
              isLoading={loadingTier === "pro"}
            />
            <PlanCard
              tier="max"
              currentTier={team.tier}
              onSelect={handleSubscriptionSelect}
              isLoading={loadingTier === "max"}
            />
          </div>
        </div>
      )}

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
          <PageHeader title="Billing" description="Manage your team subscription and payments" />
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
