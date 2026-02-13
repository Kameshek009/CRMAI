"use client";

import Link from "next/link";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  ExternalLink,
  RefreshCw,
  Wifi,
  AlertTriangle,
  Sparkles,
  CreditCard,
  Monitor,
  Users,
  ArrowRight,
  Zap,
} from "lucide-react";
import { useAccount } from "@/contexts/account-context";
import { UpgradeModal, useUpgradeModal } from "@/components/billing";

interface DashboardContentProps {
  userName: string;
  email: string;
  imageUrl: string;
}

export function DashboardContent({ userName }: DashboardContentProps) {
  const { account, usage, isLoading, error, refetch, isConnected } = useAccount();
  const { isOpen, modalProps, showUpgradeModal, closeUpgradeModal } = useUpgradeModal();

  const tierDisplayName = account?.tier
    ? account.tier.charAt(0).toUpperCase() + account.tier.slice(1)
    : "Free";

  const formatTokens = (count: number) => {
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(0)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K`;
    return count.toLocaleString();
  };

  const tokenLimitDisplay = account?.tokenLimit
    ? formatTokens(account.tokenLimit)
    : "1M";

  const isApproachingLimit = usage && usage.percentUsed >= 80;
  const isExceeded = usage && usage.percentUsed >= 100;

  const handleUpgradeClick = () => {
    showUpgradeModal({
      reason: isExceeded ? "weekly_cap_exceeded" : "approaching_limit",
      currentTier: account?.tier || "free",
      monthlyUsed: usage?.tokensUsed,
      monthlyLimit: usage?.tokenLimit,
    });
  };

  return (
    <PageContainer>
      <PageHeader
        title={`Welcome back, ${userName}`}
        description="Here's an overview of your NexusCRM usage"
      />

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Current Plan Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
            <Zap className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold">{tierDisplayName}</span>
                  <Badge variant="outline">{tokenLimitDisplay}/mo</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {usage?.daysRemaining} days until reset
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tokens Used Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Tokens Used</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => refetch()}
              title={isConnected ? "Live updates active" : "Click to refresh"}
            >
              {isConnected ? (
                <Wifi className="size-4 text-green-500" />
              ) : (
                <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
              )}
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="space-y-3">
                <div className="text-2xl font-bold">
                  {formatTokens(usage?.tokensUsed || 0)}
                </div>
                <Progress value={usage?.percentUsed || 0} className="h-2" />
                <p className="text-sm text-muted-foreground">
                  {usage?.percentUsed?.toFixed(1) || 0}% of monthly limit
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <div className={`size-2.5 rounded-full ${isConnected ? "bg-green-500" : "bg-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {isConnected ? "Connected" : "Offline"}
              </div>
              <p className="text-sm text-muted-foreground">
                {isConnected ? "Real-time sync active" : "Updates on refresh"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upgrade Prompt */}
      {!isLoading && isApproachingLimit && account?.tier === "free" && (
        <Card className={isExceeded ? "border-destructive" : "border-orange-500/50"}>
          <CardContent className="p-8">
            <div className="flex items-start gap-5">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-secondary">
                {isExceeded ? (
                  <AlertTriangle className="size-6 text-destructive" />
                ) : (
                  <Sparkles className="size-6 text-orange-500" />
                )}
              </div>
              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <p className="text-lg font-medium">
                    {isExceeded ? "Usage limit reached" : "Running low on tokens"}
                  </p>
                  <p className="text-muted-foreground">
                    {isExceeded
                      ? "Upgrade to continue using NexusCRM without interruption."
                      : `You've used ${Math.round(usage?.percentUsed || 0)}% of your monthly tokens.`}
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button asChild>
                    <Link href="/dashboard/account/billing">
                      View Plans
                      <ArrowRight className="ml-2 size-4" />
                    </Link>
                  </Button>
                  <Button variant="ghost" onClick={handleUpgradeClick}>
                    Learn More
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-base">
              <Monitor className="size-5" />
              Desktop Agent
            </CardTitle>
            <CardDescription>
              Connect for AI-powered automation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full h-11">
              Connect Desktop
              <ExternalLink className="ml-2 size-4" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-base">
              <CreditCard className="size-5" />
              Manage Subscription
            </CardTitle>
            <CardDescription>
              View billing, upgrade, or manage your plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full h-11" asChild>
              <Link href="/dashboard/account/billing">
                Billing & Plans
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Team Section */}
      <Card>
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center text-center py-8">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-secondary">
              <Users className="size-7 text-muted-foreground" />
            </div>
            <div className="mt-6 space-y-2">
              <h3 className="text-lg font-medium">Invite Team Members</h3>
              <p className="text-muted-foreground max-w-sm">
                Admin controls, analytics, and enterprise security
              </p>
            </div>
            <Button variant="outline" className="mt-6 h-11">
              Invite Your Team
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardContent className="p-6">
            <p className="text-destructive">
              Failed to load account data.{" "}
              <button onClick={() => refetch()} className="underline">
                Retry
              </button>
            </p>
          </CardContent>
        </Card>
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={isOpen}
        onClose={closeUpgradeModal}
        {...modalProps}
      />
    </PageContainer>
  );
}
