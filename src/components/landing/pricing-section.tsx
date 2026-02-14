"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlanCard {
  name: string;
  price: string;
  priceSuffix?: string;
  badge?: string;
  popular?: boolean;
  cta: string;
  ctaHref: string;
  inheritLabel?: string;
  features: string[];
  tokenHighlight?: string;
}

const plans: PlanCard[] = [
  {
    name: "Free",
    price: "$0",
    priceSuffix: "/ user / month",
    cta: "Get Started",
    ctaHref: "/sign-up",
    features: [
      "100K AI tokens / month",
      "10K tokens / week",
      "Up to 50 contacts",
      "1 company",
      "Basic pipeline (2 stages)",
      "Up to 20 tasks",
      "AI chat assistant (limited)",
      "Community support",
      "3-day activity history",
    ],
    tokenHighlight: "100K tokens/mo",
  },
  {
    name: "Pro",
    price: "$15",
    priceSuffix: "/ user / month",
    badge: "Popular",
    popular: true,
    cta: "Upgrade",
    ctaHref: "/sign-up",
    inheritLabel: "Everything from Free, and more:",
    features: [
      "10M AI tokens / month",
      "500K tokens / week",
      "Up to 200 contacts",
      "Up to 5 companies",
      "Unlimited pipeline stages",
      "AI deal insights & lead scoring",
      "Import / Export (CSV)",
      "Priority support",
      "30-day activity history",
      "Usage analytics",
      "API access",
      "Up to 5 team members",
    ],
    tokenHighlight: "10M tokens/mo",
  },
  {
    name: "Max",
    price: "$35",
    priceSuffix: "/ user / month",
    cta: "Upgrade",
    ctaHref: "/sign-up",
    inheritLabel: "Everything from Pro, and more:",
    features: [
      "100M AI tokens / month",
      "2.5M tokens / week",
      "Up to 500 contacts",
      "Up to 10 companies",
      "Advanced AI automation",
      "Custom fields",
      "Advanced analytics & reports",
      "Dedicated support",
      "Unlimited activity history",
      "Custom integrations",
      "SLA guarantee",
      "Unlimited team members",
    ],
    tokenHighlight: "100M tokens/mo",
  },
  {
    name: "Enterprise",
    price: "Custom",
    cta: "Contact Sales",
    ctaHref: "mailto:sales@nexxuscrm.com",
    inheritLabel: "Everything from Max, and more:",
    features: [
      "Unlimited AI tokens (credit-based)",
      "25+ companies",
      "Unlimited contacts",
      "Pay-as-you-go ($1 / 1M tokens)",
      "White labeling",
      "SSO (SAML / OAuth)",
      "Audit logs",
      "Dedicated infrastructure",
      "24/7 priority support",
      "Custom SLA & onboarding",
      "Volume discounts",
      "Custom integrations & API",
    ],
    tokenHighlight: "Unlimited",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 25 } },
};

export function PricingSection() {
  return (
    <section className="relative overflow-hidden px-4 sm:px-6 pt-10 sm:pt-16 pb-16 sm:pb-24">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="text-center mb-10 sm:mb-14"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-4 py-1.5 text-xs font-semibold tracking-wide text-muted-foreground mb-4">
            <Sparkles className="size-3" />
            Simple Pricing
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            Choose your plan
          </h1>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-lg mx-auto">
            Start free, scale as you grow. All plans include core CRM features
            and AI-powered insights.
          </p>
        </motion.div>

        {/* Cards */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5"
        >
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              variants={item}
              className={cn(
                "relative flex flex-col rounded-2xl border p-5 sm:p-6 transition-shadow",
                plan.popular
                  ? "border-purple-500/50 bg-gradient-to-b from-purple-500/[0.06] to-transparent shadow-lg shadow-purple-500/10"
                  : "border-border bg-card"
              )}
            >
              {/* Popular badge */}
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-1 text-xs font-semibold text-white shadow-md">
                    <Sparkles className="size-3" />
                    {plan.badge}
                  </span>
                </div>
              )}

              {/* Plan name & price */}
              <div className={cn("mb-5", plan.badge && "mt-2")}>
                <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                    {plan.price}
                  </span>
                  {plan.priceSuffix && (
                    <span className="text-sm text-muted-foreground">{plan.priceSuffix}</span>
                  )}
                </div>
              </div>

              {/* Token highlight */}
              {plan.tokenHighlight && (
                <div className="mb-4 flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2">
                  <Sparkles className="size-3.5 text-purple-500 shrink-0" />
                  <span className="text-xs font-semibold text-foreground">
                    AI: {plan.tokenHighlight}
                  </span>
                </div>
              )}

              {/* CTA */}
              <Link
                href={plan.ctaHref}
                className={cn(
                  "flex items-center justify-center h-10 sm:h-11 rounded-xl text-sm font-semibold transition-all mb-5",
                  plan.popular
                    ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:opacity-90 shadow-md"
                    : "border-2 border-foreground bg-background text-foreground hover:bg-muted"
                )}
              >
                {plan.cta}
              </Link>

              {/* Inherit label */}
              {plan.inheritLabel && (
                <p className="text-xs font-bold text-foreground mb-3">
                  {plan.inheritLabel}
                </p>
              )}

              {/* Features */}
              <ul className="flex flex-col gap-2.5 flex-1">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <Check
                      className={cn(
                        "size-4 shrink-0 mt-0.5",
                        plan.popular ? "text-purple-500" : "text-emerald-500"
                      )}
                      strokeWidth={2.5}
                    />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>

        {/* FAQ-like note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-xs text-muted-foreground mt-8 sm:mt-12"
        >
          All plans include SSL, 99.9% uptime SLA, and GDPR compliance. Cancel anytime.
        </motion.p>
      </div>

      {/* Background gradient orbs */}
      <div className="pointer-events-none absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-purple-500/[0.05] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-[400px] w-[400px] rounded-full bg-blue-500/[0.05] blur-3xl" />
    </section>
  );
}
