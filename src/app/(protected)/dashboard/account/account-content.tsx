"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { CustomerBillingCard, InvoiceHistory } from "@/components/billing";
import { Check, Loader2, Crown, Settings, CreditCard, AlertTriangle, ArrowRight, Palette } from "lucide-react";
import { ThemeToggleSlider } from "@/components/theme-toggle-slider";
import type { Account, UsageStats } from "@/types";
import type { CustomerBillingInfoData, InvoiceInfo } from "@/components/billing";

interface AccountContentProps {
  email: string;
  name: string;
  imageUrl: string;
}

interface BillingData {
  account: Account;
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
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(0)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(0)}K`;
  }
  return count.toLocaleString();
}

export function AccountContent({ email, name, imageUrl }: AccountContentProps) {
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
          setError(data.error || "Failed to load billing data");
        }
      } catch (err) {
        setError("Failed to load billing data");
        console.error("Error fetching billing data:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchBillingData();
  }, []);

  const tierInfo = billingData ? getTierInfo(billingData.account.tier) : null;
  const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <PageContainer>
      <PageHeader
        title="Account Settings"
        description="Manage your profile and subscription"
      />

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="size-4" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarImage src={imageUrl} alt={name} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-medium">{name}</p>
              <p className="text-sm text-muted-foreground">{email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appearance Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="size-4" />
            Appearance
          </CardTitle>
          <CardDescription>
            Customize how NexusCRM looks for you
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Theme</p>
              <p className="text-sm text-muted-foreground">
                Switch between light and dark mode
              </p>
            </div>
            <ThemeToggleSlider />
          </div>
        </CardContent>
      </Card>

      {/* Subscription Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="size-4" />
            Subscription
          </CardTitle>
          <CardDescription>
            Your current plan and usage limits
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                    Active
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {billingData.account.tier === "enterprise"
                    ? `${formatTokens(billingData.account.tokenCredits)} credits remaining`
                    : `${formatTokens(billingData.account.tokenLimit)} tokens per month`}
                </p>
              </div>
              {billingData.account.tier === "free" && (
                <Button asChild>
                  <Link href="/dashboard/account/billing">
                    Upgrade
                    <ArrowRight className="ml-1 size-3" />
                  </Link>
                </Button>
              )}
              {billingData.account.tier !== "free" && (
                <Button variant="outline" asChild>
                  <Link href="/dashboard/account/billing">
                    Manage Plan
                  </Link>
                </Button>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Billing Details (from Stripe) */}
      {!isLoading && billingData && (
        <CustomerBillingCard
          billingInfo={billingData.stripeBilling}
          isLoading={isLoading}
        />
      )}

      {/* Invoice History (from Stripe) */}
      {!isLoading && billingData?.stripeBilling?.invoices && (
        <InvoiceHistory
          invoices={billingData.stripeBilling.invoices as InvoiceInfo[]}
          isLoading={isLoading}
        />
      )}

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <AlertTriangle className="size-4" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible actions for your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Delete Account</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all data
              </p>
            </div>
            <Button variant="destructive">Delete Account</Button>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
