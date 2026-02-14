"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  Sparkles,
  CreditCard,
  Users,
  ArrowRight,
  Zap,
  Handshake,
  CheckSquare,
  TrendingUp,
  DollarSign,
  Lightbulb,
  AlertCircle,
  Info,
} from "lucide-react";
import { useAccount } from "@/contexts/account-context";
import { UpgradeModal, useUpgradeModal } from "@/components/billing";
import type { CrmStats, AIInsight } from "@/types/crm";

interface DashboardContentProps {
  userName: string;
  email: string;
  imageUrl: string;
}

export function DashboardContent({ userName }: DashboardContentProps) {
  const { account, usage, isLoading, error, refetch } = useAccount();
  const { isOpen, modalProps, showUpgradeModal, closeUpgradeModal } = useUpgradeModal();
  const [crmStats, setCrmStats] = useState<CrmStats | null>(null);
  const [insights, setInsights] = useState<AIInsight[]>([]);

  useEffect(() => {
    fetch("/api/crm/stats").then((r) => r.json()).then((d) => d.success && setCrmStats(d.data)).catch(() => {});
    fetch("/api/crm/ai/insights").then((r) => r.json()).then((d) => d.success && setInsights(d.data)).catch(() => {});
  }, []);

  const tierDisplayName = account?.tier
    ? account.tier.charAt(0).toUpperCase() + account.tier.slice(1)
    : "Free";

  const formatTokens = (count: number) => {
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(0)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K`;
    return count.toLocaleString();
  };

  const tokenLimitDisplay = account?.tokenLimit ? formatTokens(account.tokenLimit) : "1M";
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

  const insightIcons = {
    warning: AlertCircle,
    opportunity: TrendingUp,
    action: Lightbulb,
    info: Info,
  };

  const insightColors = {
    warning: "text-amber-600 bg-amber-500/10",
    opportunity: "text-emerald-600 bg-emerald-500/10",
    action: "text-blue-600 bg-blue-500/10",
    info: "text-gray-600 bg-gray-500/10",
  };

  return (
    <PageContainer>
      <PageHeader
        title={`Welcome back, ${userName}`}
        description="Here's an overview of your Nexxus CRM"
      />

      {/* CRM Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Open Deals</CardTitle>
            <Handshake className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{crmStats?.openDeals ?? "-"}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ${(crmStats?.pipelineValue ?? 0).toLocaleString()} pipeline value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tasks Due Today</CardTitle>
            <CheckSquare className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{crmStats?.tasksDueToday ?? "-"}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {crmStats?.overdueTasksCount ? `${crmStats.overdueTasksCount} overdue` : "All on track"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Contacts</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{crmStats?.totalContacts ?? "-"}</div>
            <p className="text-xs text-muted-foreground mt-1">
              +{crmStats?.newContactsThisWeek ?? 0} this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Won This Month</CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(crmStats?.wonValueThisMonth ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {crmStats?.wonDealsThisMonth ?? 0} deal{(crmStats?.wonDealsThisMonth ?? 0) !== 1 ? "s" : ""} closed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      {insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-5" />
              AI Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.map((insight) => {
                const Icon = insightIcons[insight.type] || Info;
                const color = insightColors[insight.type] || insightColors.info;
                return (
                  <div key={insight.id} className="flex items-start gap-3">
                    <div className={`flex size-8 items-center justify-center rounded-full ${color}`}>
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{insight.title}</p>
                      <p className="text-sm text-muted-foreground">{insight.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan & Usage Row */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
                <p className="text-sm text-muted-foreground">{usage?.daysRemaining} days until reset</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Token Usage</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="space-y-3">
                <div className="text-2xl font-bold">{formatTokens(usage?.tokensUsed || 0)}</div>
                <Progress value={usage?.percentUsed || 0} className="h-2" />
                <p className="text-sm text-muted-foreground">{usage?.percentUsed?.toFixed(1) || 0}% used</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-sm font-medium">
              <CreditCard className="size-4" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/dashboard/contacts">
                <Users className="size-4 mr-2" />
                View Contacts
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/dashboard/pipeline">
                <Handshake className="size-4 mr-2" />
                Open Pipeline
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Upgrade Prompt */}
      {!isLoading && isApproachingLimit && account?.tier === "free" && (
        <Card className={isExceeded ? "border-destructive" : "border-warning/50"}>
          <CardContent className="p-8">
            <div className="flex items-start gap-5">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-secondary">
                {isExceeded ? (
                  <AlertTriangle className="size-6 text-destructive" />
                ) : (
                  <Sparkles className="size-6 text-warning" />
                )}
              </div>
              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <p className="text-lg font-medium">
                    {isExceeded ? "Usage limit reached" : "Running low on tokens"}
                  </p>
                  <p className="text-muted-foreground">
                    {isExceeded
                      ? "Upgrade to continue using Nexxus CRM without interruption."
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

      {error && (
        <Card className="border-destructive">
          <CardContent className="p-6">
            <p className="text-destructive">
              Failed to load account data.{" "}
              <button onClick={() => refetch()} className="underline">Retry</button>
            </p>
          </CardContent>
        </Card>
      )}

      <UpgradeModal isOpen={isOpen} onClose={closeUpgradeModal} {...modalProps} />
    </PageContainer>
  );
}
