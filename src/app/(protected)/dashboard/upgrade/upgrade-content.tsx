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
import { useWorkspace } from "@/contexts/team-context";
import { useTranslation } from "@/lib/i18n";
import { TIER_LIMITS, type SubscriptionTier } from "@/types";
import { useState } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Plan config                                                        */
/* ------------------------------------------------------------------ */

interface PlanConfig {
  tier: SubscriptionTier;
  nameKey: string;
  descriptionKey: string;
  icon: typeof Sparkles;
  accent: string;
  badgeVariant: "default" | "secondary" | "outline";
  popular?: boolean;
}

const plans: PlanConfig[] = [
  {
    tier: "free",
    nameKey: "billing.plans.free",
    descriptionKey: "billing.upgradePage.freeDesc",
    icon: Sparkles,
    accent: "",
    badgeVariant: "outline",
  },
  {
    tier: "pro",
    nameKey: "billing.plans.pro",
    descriptionKey: "billing.upgradePage.proDesc",
    icon: Zap,
    accent: "ring-2 ring-primary shadow-lg shadow-primary/10",
    badgeVariant: "default",
    popular: true,
  },
  {
    tier: "max",
    nameKey: "billing.plans.max",
    descriptionKey: "billing.upgradePage.maxDesc",
    icon: Crown,
    accent: "",
    badgeVariant: "secondary",
  },
  {
    tier: "enterprise",
    nameKey: "billing.plans.enterprise",
    descriptionKey: "billing.upgradePage.enterpriseDesc",
    icon: Building2,
    accent: "",
    badgeVariant: "secondary",
  },
];

/* ------------------------------------------------------------------ */
/*  Feature comparison rows                                            */
/* ------------------------------------------------------------------ */

interface ComparisonRow {
  labelKey: string;
  free: string | boolean;
  pro: string | boolean;
  max: string | boolean;
  enterprise: string | boolean;
}

const comparisonRows: ComparisonRow[] = [
  { labelKey: "billing.upgradePage.compAiTokens", free: "50K", pro: "500K", max: "1.5M", enterprise: "unlimited" },
  { labelKey: "billing.upgradePage.compContacts", free: "100", pro: "5,000", max: "25,000", enterprise: "unlimited" },
  { labelKey: "billing.upgradePage.compCompanies", free: "5", pro: "500", max: "5,000", enterprise: "unlimited" },
  { labelKey: "billing.upgradePage.compDeals", free: "50", pro: "2,500", max: "15,000", enterprise: "unlimited" },
  { labelKey: "billing.upgradePage.compLeads", free: "50", pro: "2,500", max: "15,000", enterprise: "unlimited" },
  { labelKey: "billing.upgradePage.compTasks", free: "50", pro: "unlimited", max: "unlimited", enterprise: "unlimited" },
  { labelKey: "billing.upgradePage.compPipelineStages", free: "3", pro: "unlimited", max: "unlimited", enterprise: "unlimited" },
  { labelKey: "billing.upgradePage.compCustomFields", free: "5", pro: "30", max: "100", enterprise: "500" },
  { labelKey: "billing.upgradePage.compActiveAutomations", free: false, pro: "10", max: "50", enterprise: "200" },
  { labelKey: "billing.upgradePage.compEmailTemplates", free: "3", pro: "25", max: "100", enterprise: "unlimited" },
  { labelKey: "billing.upgradePage.compEmailSequences", free: false, pro: "5", max: "25", enterprise: "unlimited" },
  { labelKey: "billing.upgradePage.compVisibilityGroups", free: false, pro: "3", max: "10", enterprise: "unlimited" },
  { labelKey: "billing.upgradePage.compTeamMembers", free: "3", pro: "unlimited", max: "unlimited", enterprise: "unlimited" },
  { labelKey: "billing.upgradePage.compAiDealInsights", free: false, pro: true, max: true, enterprise: true },
  { labelKey: "billing.upgradePage.compImportExport", free: false, pro: true, max: true, enterprise: true },
  { labelKey: "billing.upgradePage.compAdvancedAnalytics", free: false, pro: false, max: true, enterprise: true },
  { labelKey: "billing.upgradePage.compApiAccess", free: false, pro: true, max: true, enterprise: true },
  { labelKey: "billing.upgradePage.compSsoSaml", free: false, pro: false, max: false, enterprise: true },
  { labelKey: "billing.upgradePage.compDedicatedSupport", free: false, pro: false, max: true, enterprise: true },
  { labelKey: "billing.upgradePage.compSlaGuarantee", free: false, pro: false, max: true, enterprise: true },
];

/* ------------------------------------------------------------------ */
/*  FAQ                                                                */
/* ------------------------------------------------------------------ */

const faqKeys = [
  { qKey: "billing.upgradePage.faqPricingQ", aKey: "billing.upgradePage.faqPricingA" },
  { qKey: "billing.upgradePage.faqChangePlanQ", aKey: "billing.upgradePage.faqChangePlanA" },
  { qKey: "billing.upgradePage.faqTokensQ", aKey: "billing.upgradePage.faqTokensA" },
  { qKey: "billing.upgradePage.faqEnterpriseQ", aKey: "billing.upgradePage.faqEnterpriseA" },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatTokens(count: number) {
  if (count >= 1_000_000) return `${count / 1_000_000}M`;
  if (count >= 1_000) return `${count / 1_000}K`;
  return count.toLocaleString();
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function ComparisonCell({ value, unlimitedLabel }: { value: string | boolean; unlimitedLabel: string }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="size-4 text-primary mx-auto" />
    ) : (
      <X className="size-4 text-muted-foreground/40 mx-auto" />
    );
  }
  if (value === "unlimited") {
    return <span className="text-sm font-medium">{unlimitedLabel}</span>;
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
  const { currentWorkspace, isLoading, isOwner } = useWorkspace();
  const { t } = useTranslation();
  const currentTier = (currentWorkspace?.tier || "free") as SubscriptionTier;
  const seatCount = currentWorkspace?.seatCount || 1;

  const tierOrder: SubscriptionTier[] = ["free", "pro", "max", "enterprise"];

  const isUpgrade = (tier: SubscriptionTier) =>
    tierOrder.indexOf(tier) > tierOrder.indexOf(currentTier);

  const isCurrent = (tier: SubscriptionTier) => tier === currentTier;

  function formatPrice(tier: SubscriptionTier) {
    const limits = TIER_LIMITS[tier];
    if (tier === "enterprise") return t("billing.upgradePage.custom");
    if (!limits.priceMonthly) return "$0";
    return `$${limits.priceMonthly}`;
  }

  return (
    <PageContainer>
      {/* Header */}
      <PageHeader
        title={t("billing.upgradePage.title")}
        description={t("billing.upgradePage.description")}
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
                    <p className="font-semibold">{t("billing.upgradePage.currentPlan")}</p>
                    <Badge variant="outline" className="capitalize">{currentTier}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {currentWorkspace
                      ? t("billing.upgradePage.tokensUsedSummary", {
                          used: formatTokens(currentWorkspace.tokensUsed),
                          limit: formatTokens(currentWorkspace.tokenLimit),
                          seats: seatCount,
                        })
                      : t("common.loading")}
                  </p>
                </div>
              </div>
              {currentWorkspace && currentWorkspace.tokenLimit > 0 && (
                <div className="w-full sm:w-48">
                  <Progress value={Math.min(100, (currentWorkspace.tokensUsed / currentWorkspace.tokenLimit) * 100)} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1 text-right">
                    {t("billing.upgradePage.percentUsed", {
                      percent: Math.min(100, (currentWorkspace.tokensUsed / currentWorkspace.tokenLimit) * 100).toFixed(0),
                    })}
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
          const planName = t(plan.nameKey);

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
                  {t("billing.upgradePage.mostPopular")}
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
                <CardTitle className="text-lg">{planName}</CardTitle>
                <p className="text-sm text-muted-foreground">{t(plan.descriptionKey)}</p>
              </CardHeader>

              <CardContent className="flex-1 space-y-6">
                {/* Price */}
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{formatPrice(plan.tier)}</span>
                  {plan.tier !== "enterprise" && (
                    <span className="text-muted-foreground text-sm">
                      {limits.priceMonthly ? t("billing.upgradePage.perUserMonth") : t("billing.upgradePage.forever")}
                    </span>
                  )}
                </div>

                {/* Token highlight */}
                <div className="rounded-xl bg-secondary p-4">
                  <p className="text-xs text-muted-foreground">{t("billing.upgradePage.includes")}</p>
                  <p className="text-base font-semibold mt-1">
                    {plan.tier === "enterprise"
                      ? t("billing.upgradePage.unlimitedTokens")
                      : t("billing.upgradePage.tokensPerMonth", { count: formatTokens(limits.monthlyTokenLimit) })}
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
                    {t("billing.upgradePage.currentPlan")}
                  </Button>
                ) : plan.tier === "enterprise" ? (
                  <Button variant="outline" className="w-full" asChild>
                    <a href="mailto:sales@nexxuscrm.com">
                      {t("billing.upgradePage.contactSales")}
                      <ArrowRight className="ml-2 size-4" />
                    </a>
                  </Button>
                ) : upgrade && isOwner ? (
                  <Button className="w-full" asChild>
                    <Link href={`/dashboard/account/billing?upgrade=${plan.tier}`}>
                      {t("billing.upgradePage.upgradeTo", { plan: planName })}
                      <ArrowRight className="ml-2 size-4" />
                    </Link>
                  </Button>
                ) : upgrade && !isOwner ? (
                  <Button variant="outline" className="w-full" disabled>
                    {t("billing.upgradePage.askDirector")}
                  </Button>
                ) : (
                  <Button variant="outline" className="w-full" disabled>
                    {t("billing.upgradePage.downgradeViaBilling")}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Feature Comparison Table */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">{t("billing.upgradePage.comparePlans")}</h2>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left font-medium p-4 w-[200px]">{t("billing.upgradePage.feature")}</th>
                    <th className="text-center font-medium p-4">{t("billing.plans.free")}</th>
                    <th className="text-center font-medium p-4">
                      <span className="flex items-center justify-center gap-2">
                        {t("billing.plans.pro")}
                        <Badge variant="secondary" className="text-xs px-2 py-0">{t("billing.upgradePage.popular")}</Badge>
                      </span>
                    </th>
                    <th className="text-center font-medium p-4">{t("billing.plans.max")}</th>
                    <th className="text-center font-medium p-4">{t("billing.plans.enterprise")}</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-4 font-medium text-muted-foreground">{t(row.labelKey)}</td>
                      <td className="p-4 text-center"><ComparisonCell value={row.free} unlimitedLabel={t("billing.upgradePage.unlimited")} /></td>
                      <td className="p-4 text-center bg-primary/[0.02]"><ComparisonCell value={row.pro} unlimitedLabel={t("billing.upgradePage.unlimited")} /></td>
                      <td className="p-4 text-center"><ComparisonCell value={row.max} unlimitedLabel={t("billing.upgradePage.unlimited")} /></td>
                      <td className="p-4 text-center"><ComparisonCell value={row.enterprise} unlimitedLabel={t("billing.upgradePage.unlimited")} /></td>
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
          {t("billing.upgradePage.faq")}
        </h2>
        <Card>
          <CardContent className="p-6">
            {faqKeys.map((faq, i) => (
              <FaqItem key={i} q={t(faq.qKey)} a={t(faq.aKey)} />
            ))}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
