"use client";

import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Wifi, TrendingUp, Calendar, Zap, BarChart3 } from "lucide-react";
import { useAccount } from "@/contexts/account-context";
import { useTranslation } from "@/lib/i18n";

export function UsageContent() {
  const { t } = useTranslation();
  const { account, usage, isLoading, error, refetch, isConnected } = useAccount();

  const used = usage?.tokensUsed ?? 0;
  const limit = usage?.tokenLimit ?? 10000;
  const percentage = usage?.percentUsed ?? 0;
  const daysRemaining = usage?.daysRemaining ?? 30;
  const remaining = usage?.tokensRemaining ?? 0;

  const formatTokens = (count: number) => {
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return count.toLocaleString();
  };

  return (
    <PageContainer>
      <PageHeader
        title={t("crm.usage.title")}
        description={t("crm.usage.description")}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          {isConnected ? (
            <Wifi className="mr-2 size-4 text-success" />
          ) : (
            <RefreshCw className={`mr-2 size-4 ${isLoading ? "animate-spin" : ""}`} />
          )}
          {isConnected ? t("crm.usage.live") : t("crm.usage.refresh")}
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-4">
            <BarChart3 className="size-5" />
            {t("crm.usage.tokenUsage")}
          </CardTitle>
          <CardDescription>
            {t("crm.usage.billingPeriod")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="flex items-end justify-between">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{t("crm.usage.tokensUsed")}</p>
              {isLoading ? (
                <Skeleton className="h-12 w-40" />
              ) : (
                <p className="text-4xl font-bold tracking-tight">
                  {used.toLocaleString()}
                </p>
              )}
            </div>
            <div className="text-right space-y-1">
              {isLoading ? (
                <Skeleton className="h-8 w-28" />
              ) : (
                <>
                  <p className="text-2xl font-semibold">{limit.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">{t("crm.usage.monthlyLimit")}</p>
                </>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <Progress value={percentage} className="h-3" />
            {isLoading ? (
              <Skeleton className="h-5 w-48" />
            ) : (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{t("crm.usage.used", { percent: percentage.toFixed(1) })}</span>
                <span>{daysRemaining === 1 ? t("crm.usage.resetsInOne", { days: daysRemaining }) : t("crm.usage.resetsIn", { days: daysRemaining })}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">{t("crm.usage.remaining")}</CardTitle>
            <Zap className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="space-y-2">
                <div className="text-2xl font-bold">{formatTokens(remaining)}</div>
                <p className="text-sm text-muted-foreground">{t("crm.usage.tokensAvailable")}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">{t("crm.usage.currentPlan")}</CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="space-y-2">
                <div className="text-2xl font-bold uppercase">
                  {account?.tier || "FREE"}
                </div>
                <p className="text-sm text-muted-foreground">{t("crm.usage.subscriptionTier")}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">{t("crm.usage.daysLeft")}</CardTitle>
            <Calendar className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="space-y-2">
                <div className="text-2xl font-bold">{daysRemaining}</div>
                <p className="text-sm text-muted-foreground">{t("crm.usage.untilReset")}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">{t("crm.usage.dailyAvg")}</CardTitle>
            <BarChart3 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="space-y-2">
                <div className="text-2xl font-bold">
                  {formatTokens(Math.round(used / Math.max(30 - daysRemaining, 1)))}
                </div>
                <p className="text-sm text-muted-foreground">{t("crm.usage.tokensPerDay")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p className="font-medium">{t("crm.usage.realtimeSync")}</p>
              <p className="text-muted-foreground">
                {isConnected
                  ? t("crm.usage.connected")
                  : t("crm.usage.disconnected")}
              </p>
            </div>
            <Badge variant={isConnected ? "default" : "secondary"} className="h-8 px-4">
              <div className={`size-2.5 rounded-full mr-2 ${isConnected ? "bg-success" : "bg-muted-foreground"}`} />
              {isConnected ? t("crm.usage.live") : t("crm.usage.offline")}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardContent className="p-6">
            <p className="text-destructive">
              {t("crm.usage.failedLoad")}{" "}
              <button onClick={() => refetch()} className="underline">
                {t("crm.usage.retry")}
              </button>
            </p>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
