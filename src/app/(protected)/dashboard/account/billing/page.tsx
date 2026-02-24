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
import { useTranslation } from "@/lib/i18n";
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
  const { t } = useTranslation();
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
      setError(err instanceof Error ? err.message : t("billing.page.checkoutFailed"));
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
        setError(t("billing.page.failedLoadData"));
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
        <PageHeader title={t("billing.page.title")} description={t("billing.page.description")} />
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
        <PageHeader title={t("billing.page.title")} description={t("billing.page.description")} />
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <AlertCircle className="size-14 text-destructive" />
              <div className="mt-6 space-y-2">
                <h2 className="text-xl font-semibold">{t("billing.page.failedToLoad")}</h2>
                <p className="text-muted-foreground max-w-sm">
                  {error || t("billing.page.unexpectedError")}
                </p>
              </div>
              <Button
                variant="outline"
                className="mt-6 h-11"
                onClick={() => window.location.reload()}
              >
                {t("billing.page.tryAgain")}
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
      <PageHeader title={t("billing.page.title")} description={t("billing.page.teamDescription", { name: team.name })}>
        {team.isDirector && (
          <ManageSubscriptionButton customerId={null} />
        )}
      </PageHeader>

      {/* Current Plan Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-4">
                <CreditCard className="size-5" />
                {t("billing.page.currentPlan")}
              </CardTitle>
              <CardDescription>
                {team.isDirector
                  ? t("billing.page.subscriptionAndUsage")
                  : t("billing.page.managedByDirector")}
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2 capitalize">
              {team.tier}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{t("billing.page.tokensUsed")}</p>
              <p className="text-2xl font-bold">{formatTokens(usageStats.tokensUsed)}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{t("billing.page.monthlyLimit")}</p>
              <p className="text-2xl font-bold">{formatTokens(usageStats.tokenLimit)}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Users className="size-3.5" />
                {t("billing.page.seats")}
              </p>
              <p className="text-2xl font-bold">{team.seatCount}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{t("billing.page.daysRemaining")}</p>
              <p className="text-2xl font-bold">{usageStats.daysRemaining}</p>
            </div>
          </div>

          {/* Per-seat cost breakdown */}
          {team.tier !== "free" && team.isDirector && (
            <div className="rounded-xl bg-secondary p-4">
              <p className="text-sm text-muted-foreground">{t("billing.page.monthlyCost")}</p>
              <p className="text-lg font-semibold mt-1">
                {t("billing.page.seatCostBreakdown", { count: team.seatCount, price: perSeatPrice, total: totalMonthly.toFixed(2) })}
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{t("billing.page.percentUsed", { percent: usageStats.percentUsed.toFixed(1) })}</span>
              <span>{t("billing.page.remaining", { count: formatTokens(usageStats.tokensRemaining) })}</span>
            </div>
            <Progress value={usageStats.percentUsed} className="h-2.5" />
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 text-destructive">
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
            <h2 className="text-xl font-semibold">{t("billing.page.subscriptionPlans")}</h2>
            <p className="text-muted-foreground">
              {t("billing.page.perSeatPricing")}
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

function BillingPageFallback() {
  const { t } = useTranslation();
  return (
    <PageContainer>
      <PageHeader title={t("billing.page.title")} description={t("billing.page.description")} />
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    </PageContainer>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<BillingPageFallback />}>
      <BillingPageContent />
    </Suspense>
  );
}
