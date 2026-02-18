"use client";

import Link from "next/link";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Check,
  X,
  Sparkles,
  Zap,
  Crown,
  Building2,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  HelpCircle,
} from "lucide-react";
import { useTeam } from "@/contexts/team-context";
import { TIER_LIMITS, type SubscriptionTier } from "@/types";
import { useState } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Plan config                                                        */
/* ------------------------------------------------------------------ */

interface PlanConfig {
  tier: SubscriptionTier;
  name: string;
  description: string;
  icon: typeof Sparkles;
  accent: string;        // card border / ring colour
  badgeVariant: "default" | "secondary" | "outline";
  popular?: boolean;
}

const plans: PlanConfig[] = [
  {
    tier: "free",
    name: "Free",
    description: "Get started with the essentials",
    icon: Sparkles,
    accent: "",
    badgeVariant: "outline",
  },
  {
    tier: "pro",
    name: "Pro",
    description: "For growing teams and professionals",
    icon: Zap,
    accent: "ring-2 ring-primary shadow-lg shadow-primary/10",
    badgeVariant: "default",
    popular: true,
  },
  {
    tier: "max",
    name: "Max",
    description: "Maximum power for power users",
    icon: Crown,
    accent: "",
    badgeVariant: "secondary",
  },
  {
    tier: "enterprise",
    name: "Enterprise",
    description: "Custom solutions for large organisations",
    icon: Building2,
    accent: "",
    badgeVariant: "secondary",
  },
];

/* ------------------------------------------------------------------ */
/*  Feature comparison rows                                            */
/* ------------------------------------------------------------------ */

interface ComparisonRow {
  label: string;
  free: string | boolean;
  pro: string | boolean;
  max: string | boolean;
  enterprise: string | boolean;
}

const comparisonRows: ComparisonRow[] = [
  { label: "AI Tokens / month", free: "50K", pro: "500K", max: "1.5M", enterprise: "Unlimited" },
  { label: "Contacts", free: "50", pro: "200", max: "500", enterprise: "Unlimited" },
  { label: "Companies", free: "1", pro: "5", max: "10", enterprise: "25+" },
  { label: "Pipeline stages", free: "2", pro: "Unlimited", max: "Unlimited", enterprise: "Unlimited" },
  { label: "Tasks", free: "20", pro: "Unlimited", max: "Unlimited", enterprise: "Unlimited" },
  { label: "AI deal insights", free: false, pro: true, max: true, enterprise: true },
  { label: "Lead scoring", free: false, pro: true, max: true, enterprise: true },
  { label: "Import / Export CSV", free: false, pro: true, max: true, enterprise: true },
  { label: "Custom fields", free: false, pro: false, max: true, enterprise: true },
  { label: "Advanced analytics", free: false, pro: false, max: true, enterprise: true },
  { label: "API access", free: false, pro: true, max: true, enterprise: true },
  { label: "Team members", free: "3", pro: "Unlimited", max: "Unlimited", enterprise: "Unlimited" },
  { label: "Activity history", free: "3 days", pro: "30 days", max: "Unlimited", enterprise: "Unlimited" },
  { label: "SSO / SAML", free: false, pro: false, max: false, enterprise: true },
  { label: "Dedicated support", free: false, pro: false, max: true, enterprise: true },
  { label: "SLA guarantee", free: false, pro: false, max: true, enterprise: true },
];

/* ------------------------------------------------------------------ */
/*  FAQ                                                                */
/* ------------------------------------------------------------------ */

const faqs = [
  {
    q: "How does per-seat pricing work?",
    a: "The team director pays for every active member. For example, a Pro team with 10 members costs $14.99 × 10 = $149.90/mo. When members join or leave, the subscription adjusts automatically with prorated charges.",
  },
  {
    q: "Can I change my plan at any time?",
    a: "Yes! The team director can upgrade or downgrade at any time. Upgrades are prorated for the remainder of the billing cycle. Downgrades take effect at the end of the current period.",
  },
  {
    q: "What happens when the team runs out of tokens?",
    a: "Token limits are shared across the entire team. When the monthly allocation is exhausted, AI features are limited until the next billing cycle. Upgrade your plan for more tokens.",
  },
  {
    q: "How does Enterprise pricing work?",
    a: "Enterprise plans are fully customised. Contact our sales team to discuss your requirements, and we'll create a tailored solution with volume discounts and dedicated support.",
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatTokens(count: number) {
  if (count >= 1_000_000) return `${count / 1_000_000}M`;
  if (count >= 1_000) return `${count / 1_000}K`;
  return count.toLocaleString();
}

function formatPrice(tier: SubscriptionTier) {
  const limits = TIER_LIMITS[tier];
  if (tier === "enterprise") return "Custom";
  if (!limits.priceMonthly) return "$0";
  return `$${limits.priceMonthly}`;
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function ComparisonCell({ value }: { value: string | boolean }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="size-4 text-primary mx-auto" />
    ) : (
      <X className="size-4 text-muted-foreground/40 mx-auto" />
    );
  }
  return <span className="text-sm font-medium">{value}</span>;
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-4 text-left text-sm font-medium hover:text-primary transition-colors"
      >
        {q}
        {open ? <ChevronUp className="size-4 shrink-0" /> : <ChevronDown className="size-4 shrink-0" />}
      </button>
      {open && <p className="pb-4 text-sm text-muted-foreground leading-relaxed">{a}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

export function UpgradeContent() {
  const { currentTeam, isLoading, isDirector } = useTeam();
  const currentTier = (currentTeam?.tier || "free") as SubscriptionTier;
  const seatCount = currentTeam?.seatCount || 1;

  const tierOrder: SubscriptionTier[] = ["free", "pro", "max", "enterprise"];

  const isUpgrade = (tier: SubscriptionTier) =>
    tierOrder.indexOf(tier) > tierOrder.indexOf(currentTier);

  const isCurrent = (tier: SubscriptionTier) => tier === currentTier;

  return (
    <PageContainer>
      {/* Header */}
      <PageHeader
        title="Upgrade Your Plan"
        description="Choose the perfect plan for your business needs"
      />

      {/* Current Plan Summary */}
      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                  <Sparkles className="size-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">Current Plan</p>
                    <Badge variant="outline" className="capitalize">{currentTier}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {currentTeam
                      ? `${formatTokens(currentTeam.tokensUsed)} / ${formatTokens(currentTeam.tokenLimit)} tokens used · ${seatCount} seats`
                      : "Loading..."}
                  </p>
                </div>
              </div>
              {currentTeam && currentTeam.tokenLimit > 0 && (
                <div className="w-full sm:w-48">
                  <Progress value={Math.min(100, (currentTeam.tokensUsed / currentTeam.tokenLimit) * 100)} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1 text-right">
                    {Math.min(100, (currentTeam.tokensUsed / currentTeam.tokenLimit) * 100).toFixed(0)}% used
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const limits = TIER_LIMITS[plan.tier];
          const current = isCurrent(plan.tier);
          const upgrade = isUpgrade(plan.tier);
          const Icon = plan.icon;

          return (
            <Card
              key={plan.tier}
              className={cn(
                "relative flex flex-col",
                current && "ring-2 ring-primary",
                plan.popular && !current && plan.accent,
              )}
            >
              {plan.popular && (
                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10">
                  Most Popular
                </Badge>
              )}

              <CardHeader className="pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn(
                    "flex size-9 items-center justify-center rounded-lg",
                    current ? "bg-primary/10" : "bg-secondary"
                  )}>
                    <Icon className="size-4" />
                  </div>
                </div>
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </CardHeader>

              <CardContent className="flex-1 space-y-6">
                {/* Price */}
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{formatPrice(plan.tier)}</span>
                  {plan.tier !== "enterprise" && (
                    <span className="text-muted-foreground text-sm">
                      {limits.priceMonthly ? "/user/mo" : "forever"}
                    </span>
                  )}
                </div>

                {/* Token highlight */}
                <div className="rounded-xl bg-secondary p-4">
                  <p className="text-xs text-muted-foreground">Includes</p>
                  <p className="text-base font-semibold mt-1">
                    {plan.tier === "enterprise"
                      ? "Unlimited tokens"
                      : `${formatTokens(limits.monthlyTokenLimit)} tokens/mo`}
                  </p>
                </div>

                {/* Features */}
                <ul className="space-y-2">
                  {limits.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="size-3.5 text-primary mt-1 shrink-0" />
                      <span className="text-sm leading-snug">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="pt-4">
                {current ? (
                  <Button variant="outline" className="w-full" disabled>
                    <Check className="mr-2 size-4" />
                    Current Plan
                  </Button>
                ) : plan.tier === "enterprise" ? (
                  <Button variant="outline" className="w-full" asChild>
                    <a href="mailto:sales@nexxuscrm.com">
                      Contact Sales
                      <ArrowRight className="ml-2 size-4" />
                    </a>
                  </Button>
                ) : upgrade && isDirector ? (
                  <Button className="w-full" asChild>
                    <Link href={`/dashboard/account/billing?upgrade=${plan.tier}`}>
                      Upgrade to {plan.name}
                      <ArrowRight className="ml-2 size-4" />
                    </Link>
                  </Button>
                ) : upgrade && !isDirector ? (
                  <Button variant="outline" className="w-full" disabled>
                    Ask Director to Upgrade
                  </Button>
                ) : (
                  <Button variant="outline" className="w-full" disabled>
                    Downgrade via Billing
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Feature Comparison Table */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Compare Plans</h2>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left font-medium p-4 w-[200px]">Feature</th>
                    <th className="text-center font-medium p-4">Free</th>
                    <th className="text-center font-medium p-4">
                      <span className="flex items-center justify-center gap-2">
                        Pro
                        <Badge variant="secondary" className="text-xs px-2 py-0">Popular</Badge>
                      </span>
                    </th>
                    <th className="text-center font-medium p-4">Max</th>
                    <th className="text-center font-medium p-4">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-4 font-medium text-muted-foreground">{row.label}</td>
                      <td className="p-4 text-center"><ComparisonCell value={row.free} /></td>
                      <td className="p-4 text-center bg-primary/[0.02]"><ComparisonCell value={row.pro} /></td>
                      <td className="p-4 text-center"><ComparisonCell value={row.max} /></td>
                      <td className="p-4 text-center"><ComparisonCell value={row.enterprise} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FAQ */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <HelpCircle className="size-5" />
          Frequently Asked Questions
        </h2>
        <Card>
          <CardContent className="p-6">
            {faqs.map((faq, i) => (
              <FaqItem key={i} q={faq.q} a={faq.a} />
            ))}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
