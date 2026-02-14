"use client";

import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Wifi, TrendingUp, Calendar, Zap, BarChart3 } from "lucide-react";
import { useAccount } from "@/contexts/account-context";

export default function UsagePage() {
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
        title="Usage Analytics"
        description="Monitor your token consumption and usage patterns"
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
          {isConnected ? "Live" : "Refresh"}
        </Button>
      </PageHeader>

      {/* Main Usage Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <BarChart3 className="size-5" />
            Token Usage
          </CardTitle>
          <CardDescription>
            Your current billing period consumption
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Large Stats */}
          <div className="flex items-end justify-between">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Tokens Used</p>
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
                  <p className="text-sm text-muted-foreground">monthly limit</p>
                </>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-3">
            <Progress value={percentage} className="h-3" />
            {isLoading ? (
              <Skeleton className="h-5 w-48" />
            ) : (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{percentage.toFixed(1)}% used</span>
                <span>Resets in {daysRemaining} day{daysRemaining !== 1 ? "s" : ""}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Remaining</CardTitle>
            <Zap className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="space-y-2">
                <div className="text-2xl font-bold">{formatTokens(remaining)}</div>
                <p className="text-sm text-muted-foreground">tokens available</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
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
                <p className="text-sm text-muted-foreground">subscription tier</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Days Left</CardTitle>
            <Calendar className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="space-y-2">
                <div className="text-2xl font-bold">{daysRemaining}</div>
                <p className="text-sm text-muted-foreground">until cycle reset</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Daily Avg</CardTitle>
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
                <p className="text-sm text-muted-foreground">tokens per day</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Real-time Status */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p className="font-medium">Real-time Sync</p>
              <p className="text-muted-foreground">
                {isConnected
                  ? "Connected - updates appear automatically"
                  : "Disconnected - click refresh to update"}
              </p>
            </div>
            <Badge variant={isConnected ? "default" : "secondary"} className="h-8 px-3">
              <div className={`size-2.5 rounded-full mr-2 ${isConnected ? "bg-success" : "bg-muted-foreground"}`} />
              {isConnected ? "Live" : "Offline"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardContent className="p-6">
            <p className="text-destructive">
              Failed to load usage data.{" "}
              <button onClick={() => refetch()} className="underline">
                Retry
              </button>
            </p>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
