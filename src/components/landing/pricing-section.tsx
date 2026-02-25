// FILE: pricing-section.tsx
"use client";

import Link from "next/link";
import { useRef, useCallback } from "react";
import { motion, useMotionValue, useSpring, useTransform, useInView } from "framer-motion";
import { Check, Sparkles, Zap, Crown, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

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
  icon: typeof Sparkles;
  gradient: string;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 200, damping: 22 } },
};

function PricingCard({ plan }: { plan: PlanCard }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const glowX = useMotionValue(0);
  const glowY = useMotionValue(0);
  const smoothX = useSpring(glowX, { stiffness: 200, damping: 30 });
  const smoothY = useSpring(glowY, { stiffness: 200, damping: 30 });
  const glowBackground = useTransform(
    [smoothX, smoothY],
    ([x, y]) => `radial-gradient(350px circle at ${x}px ${y}px, rgba(var(--landing-accent-rgb),0.10), transparent 60%)`
  );
  const Icon = plan.icon;

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    glowX.set(e.clientX - rect.left);
    glowY.set(e.clientY - rect.top);
  }, [glowX, glowY]);

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      variants={item}
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={cn(
        "group relative flex flex-col rounded-3xl border p-5 sm:p-6 transition-all duration-300 backdrop-blur-xl overflow-hidden",
        plan.popular
          ? "border-landing-accent/30 bg-white/[0.04] dark:bg-white/[0.04] shadow-2xl shadow-landing-accent/10"
          : "border-white/10 dark:border-white/10 bg-white/[0.02] dark:bg-white/[0.02] hover:border-white/20 hover:shadow-xl hover:shadow-landing-accent/5"
      )}
    >
      {/* Mouse-following glow */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: glowBackground }}
      />

      {/* Animated gradient border for popular */}
      {plan.popular && (
        <div className="absolute inset-0 rounded-3xl landing-gradient-border p-px pointer-events-none"
          style={{
            background: "linear-gradient(135deg, var(--landing-accent), var(--landing-accent), var(--landing-accent), var(--landing-accent), var(--landing-accent))",
            backgroundSize: "400% 400%",
            mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            maskComposite: "exclude",
            WebkitMaskComposite: "xor",
          }}
        />
      )}

      {/* Background gradient */}
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${plan.gradient} opacity-0 group-hover:opacity-[0.04] transition-opacity duration-500`} />

      {/* Popular badge */}
      {plan.badge && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-landing-accent px-4 py-1 text-xs font-semibold text-landing-accent-foreground shadow-lg shadow-landing-accent/20">
            <Sparkles className="size-3" />
            {plan.badge}
          </span>
        </div>
      )}

      {/* Plan icon & name */}
      <div className={cn("mb-5 relative z-10", plan.badge && "mt-2")}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center shadow-lg`}>
            <Icon className="w-5 h-5 text-landing-accent-foreground" />
          </div>
          <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
        </div>
        <div className="flex items-baseline gap-1 flex-wrap">
          <span className={cn(
            "text-3xl sm:text-4xl font-bold tracking-tight",
            plan.popular
              ? `bg-gradient-to-r ${plan.gradient} bg-clip-text text-transparent`
              : "text-foreground"
          )}>
            {plan.price}
          </span>
          {plan.priceSuffix && (
            <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">{plan.priceSuffix}</span>
          )}
        </div>
      </div>

      {/* Token highlight */}
      {plan.tokenHighlight && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-white/[0.03] border border-white/10 px-3 py-2 relative z-10">
          <Sparkles className={cn("size-3.5 shrink-0", plan.popular ? "text-landing-accent" : "text-muted-foreground/50")} />
          <span className="text-xs font-semibold text-foreground">AI: {plan.tokenHighlight}</span>
        </div>
      )}

      {/* CTA */}
      <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="relative z-10">
        <Link
          href={plan.ctaHref}
          className={cn(
            "flex items-center justify-center h-11 rounded-xl text-sm font-semibold transition-all mb-5",
            plan.popular
              ? "bg-landing-accent text-landing-accent-foreground hover:shadow-lg hover:shadow-landing-accent/20"
              : "border border-white/15 bg-white/5 text-foreground hover:bg-white/10"
          )}
        >
          {plan.cta}
        </Link>
      </motion.div>

      {/* Inherit label */}
      {plan.inheritLabel && (
        <p className="text-xs font-bold text-foreground mb-3 relative z-10">{plan.inheritLabel}</p>
      )}

      {/* Features */}
      <ul className="flex flex-col gap-2.5 flex-1 relative z-10">
        {plan.features.map((feat) => (
          <li key={feat} className="flex items-start gap-2.5 text-sm text-muted-foreground">
            <Check
              className={cn(
                "size-4 shrink-0 mt-0.5",
                plan.popular ? "text-landing-accent" : "text-emerald-500/70"
              )}
              strokeWidth={2.5}
            />
            <span>{feat}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

export function PricingSection() {
  const { t } = useTranslation();

  const freeFeatures = [
    t("landing.pricing.plans.free.features.0"),
    t("landing.pricing.plans.free.features.1"),
    t("landing.pricing.plans.free.features.2"),
    t("landing.pricing.plans.free.features.3"),
    t("landing.pricing.plans.free.features.4"),
    t("landing.pricing.plans.free.features.5"),
    t("landing.pricing.plans.free.features.6"),
    t("landing.pricing.plans.free.features.7"),
    t("landing.pricing.plans.free.features.8"),
    t("landing.pricing.plans.free.features.9"),
  ];

  const proFeatures = [
    t("landing.pricing.plans.pro.features.0"),
    t("landing.pricing.plans.pro.features.1"),
    t("landing.pricing.plans.pro.features.2"),
    t("landing.pricing.plans.pro.features.3"),
    t("landing.pricing.plans.pro.features.4"),
    t("landing.pricing.plans.pro.features.5"),
    t("landing.pricing.plans.pro.features.6"),
    t("landing.pricing.plans.pro.features.7"),
    t("landing.pricing.plans.pro.features.8"),
    t("landing.pricing.plans.pro.features.9"),
    t("landing.pricing.plans.pro.features.10"),
    t("landing.pricing.plans.pro.features.11"),
  ];

  const maxFeatures = [
    t("landing.pricing.plans.max.features.0"),
    t("landing.pricing.plans.max.features.1"),
    t("landing.pricing.plans.max.features.2"),
    t("landing.pricing.plans.max.features.3"),
    t("landing.pricing.plans.max.features.4"),
    t("landing.pricing.plans.max.features.5"),
    t("landing.pricing.plans.max.features.6"),
    t("landing.pricing.plans.max.features.7"),
    t("landing.pricing.plans.max.features.8"),
    t("landing.pricing.plans.max.features.9"),
    t("landing.pricing.plans.max.features.10"),
  ];

  const enterpriseFeatures = [
    t("landing.pricing.plans.enterprise.features.0"),
    t("landing.pricing.plans.enterprise.features.1"),
    t("landing.pricing.plans.enterprise.features.2"),
    t("landing.pricing.plans.enterprise.features.3"),
    t("landing.pricing.plans.enterprise.features.4"),
    t("landing.pricing.plans.enterprise.features.5"),
    t("landing.pricing.plans.enterprise.features.6"),
    t("landing.pricing.plans.enterprise.features.7"),
    t("landing.pricing.plans.enterprise.features.8"),
    t("landing.pricing.plans.enterprise.features.9"),
  ];

  const plans: PlanCard[] = [
    {
      name: "Free",
      price: "$0",
      priceSuffix: t("landing.pricing.perUserMonth"),
      cta: t("landing.pricing.plans.free.cta"),
      ctaHref: "/sign-up",
      icon: Sparkles,
      gradient: "from-landing-accent to-landing-accent",
      features: freeFeatures,
      tokenHighlight: t("landing.pricing.plans.free.tokenHighlight"),
    },
    {
      name: "Pro",
      price: "$14.99",
      priceSuffix: t("landing.pricing.perUserMonth"),
      badge: t("landing.pricing.mostPopular"),
      popular: true,
      cta: t("landing.pricing.plans.pro.cta"),
      ctaHref: "/sign-up",
      icon: Zap,
      gradient: "from-landing-accent to-landing-accent",
      inheritLabel: t("landing.pricing.plans.pro.inheritLabel"),
      features: proFeatures,
      tokenHighlight: t("landing.pricing.plans.pro.tokenHighlight"),
    },
    {
      name: "Max",
      price: "$34.99",
      priceSuffix: t("landing.pricing.perUserMonth"),
      cta: t("landing.pricing.plans.max.cta"),
      ctaHref: "/sign-up",
      icon: Crown,
      gradient: "from-landing-accent to-landing-accent",
      inheritLabel: t("landing.pricing.plans.max.inheritLabel"),
      features: maxFeatures,
      tokenHighlight: t("landing.pricing.plans.max.tokenHighlight"),
    },
    {
      name: "Enterprise",
      price: "Custom",
      cta: t("landing.pricing.plans.enterprise.cta"),
      ctaHref: "mailto:sales@nexxuscrm.com",
      icon: Building2,
      gradient: "from-landing-accent to-landing-accent",
      inheritLabel: t("landing.pricing.plans.enterprise.inheritLabel"),
      features: enterpriseFeatures,
      tokenHighlight: t("landing.pricing.plans.enterprise.tokenHighlight"),
    },
  ];

  return (
    <section id="pricing" className="relative overflow-hidden px-4 sm:px-6 pt-10 sm:pt-16 pb-16 sm:pb-24">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="text-center mb-10 sm:mb-14"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2 text-xs font-semibold tracking-wide text-muted-foreground backdrop-blur-xl mb-6">
            <Sparkles className="size-3 text-amber-400" />
            {t("landing.pricing.badge")}
          </span>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tighter text-foreground">
            {t("landing.pricing.title")}
            <br />
            <span className="landing-gradient-text bg-gradient-to-r from-landing-accent via-landing-accent to-landing-accent bg-clip-text text-transparent">
              {t("landing.pricing.titleHighlight")}
            </span>
          </h1>
          <p className="mt-4 text-sm sm:text-base text-muted-foreground max-w-lg mx-auto leading-relaxed">
            {t("landing.pricing.subtitle")}
          </p>
        </motion.div>

        {/* Cards */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5"
        >
          {plans.map((plan) => (
            <PricingCard key={plan.name} plan={plan} />
          ))}
        </motion.div>

        {/* FAQ-like note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="text-center text-xs text-muted-foreground mt-8 sm:mt-12"
        >
          {t("landing.pricing.footer")}
        </motion.p>
      </div>

      {/* Background gradient orbs */}
      <div className="pointer-events-none absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full" style={{
        background: "radial-gradient(circle, rgba(var(--landing-accent-rgb),0.06) 0%, transparent 70%)",
        filter: "blur(80px)",
      }} />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-[400px] w-[400px] rounded-full" style={{
        background: "radial-gradient(circle, rgba(var(--landing-accent-rgb),0.05) 0%, transparent 70%)",
        filter: "blur(80px)",
      }} />
    </section>
  );
}
