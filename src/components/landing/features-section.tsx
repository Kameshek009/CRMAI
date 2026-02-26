// FILE: features-section.tsx
"use client";

import { memo, useRef, useCallback } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  Brain,
  GitBranch,
  Users,
  BarChart3,
  Zap,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface BentoFeature {
  icon: LucideIcon;
  title: string;
  description: string;
  gradient: string;
  iconGradient: string;
  size: "lg" | "md" | "sm";
}

/* ---------- mouse-following glow card with 3D tilt ---------- */
const BentoCard = memo(function BentoCard({ feature, index, learnMoreText }: { feature: BentoFeature; index: number; learnMoreText: string }) {
  const Icon = feature.icon;
  const cardRef = useRef<HTMLDivElement>(null);
  const glowX = useMotionValue(0);
  const glowY = useMotionValue(0);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothGlowX = useSpring(glowX, { stiffness: 200, damping: 30 });
  const smoothGlowY = useSpring(glowY, { stiffness: 200, damping: 30 });
  const rotateX = useSpring(useTransform(mouseY, [-200, 200], [6, -6]), { stiffness: 200, damping: 25 });
  const rotateY = useSpring(useTransform(mouseX, [-200, 200], [-6, 6]), { stiffness: 200, damping: 25 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    glowX.set(e.clientX - rect.left);
    glowY.set(e.clientY - rect.top);
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  }, [glowX, glowY, mouseX, mouseY]);

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY]);

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        delay: index * 0.08,
        type: "spring",
        stiffness: 150,
        damping: 22,
      }}
      style={{ rotateX, rotateY, transformPerspective: 1000 }}
      whileHover={{ y: -6, scale: 1.02 }}
      className={`landing-glass-card group relative overflow-hidden rounded-3xl border border-white/10 dark:border-white/10 bg-white/[0.03] dark:bg-white/[0.03] backdrop-blur-xl p-6 sm:p-8 transition-all duration-300 hover:border-white/20 dark:hover:border-white/20 hover:shadow-2xl hover:shadow-landing-accent/10 ${
        feature.size === "lg"
          ? "md:col-span-2 md:row-span-2"
          : feature.size === "md"
          ? "md:col-span-2"
          : ""
      }`}
    >
      {/* Mouse-following glow */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(400px circle at ${smoothGlowX}px ${smoothGlowY}px, rgba(var(--landing-accent-rgb),0.12), rgba(var(--landing-accent-rgb),0.06), transparent 60%)`,
        }}
      />

      {/* Background gradient */}
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-40 group-hover:opacity-70 transition-opacity duration-500`}
      />

      {/* Hover glow border effect */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: "linear-gradient(135deg, rgba(var(--landing-accent-rgb),0.1) 0%, rgba(var(--landing-accent-rgb),0.05) 50%, rgba(var(--landing-accent-rgb),0.1) 100%)",
        }}
      />

      <div className="relative z-10">
        {/* Icon with pulse ring */}
        <div className="relative mb-5 sm:mb-6">
          <div className={`inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${feature.iconGradient} shadow-lg group-hover:shadow-xl transition-all duration-300`}>
            <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-landing-accent-foreground" />
          </div>
          {/* Animated ring on hover */}
          <div className={`absolute inset-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${feature.iconGradient} opacity-0 group-hover:opacity-30 group-hover:scale-[1.6] transition-all duration-700 blur-md`} />
        </div>

        {/* Title */}
        <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mb-3">
          {feature.title}
        </h3>

        {/* Description */}
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-md">
          {feature.description}
        </p>

        {/* Mini visual for large cards */}
        {feature.size === "lg" && (
          <div className="mt-6 sm:mt-8 flex items-center gap-3">
            {[...Array(4)].map((_, i) => (
              <motion.div
                key={i}
                className={`h-1.5 rounded-full bg-gradient-to-r ${feature.iconGradient}`}
                animate={{ width: [12, 24, 16, 32, 12] }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: i * 0.4,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
        )}

        {/* Subtle arrow on hover */}
        <motion.div
          className="mt-4 flex items-center gap-1.5 text-xs font-semibold opacity-0 group-hover:opacity-60 transition-opacity duration-300"
          initial={false}
        >
          <span className={`bg-gradient-to-r ${feature.iconGradient} bg-clip-text text-transparent`}>
            {learnMoreText}
          </span>
          <motion.span
            animate={{ x: [0, 3, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className={`bg-gradient-to-r ${feature.iconGradient} bg-clip-text text-transparent`}
          >
            &rarr;
          </motion.span>
        </motion.div>
      </div>
    </motion.div>
  );
});

export function FeaturesSection() {
  const { t } = useTranslation();

  const features: BentoFeature[] = [
    {
      icon: Brain,
      title: t("landing.features.items.aiPowered.title"),
      description: t("landing.features.items.aiPowered.description"),
      gradient: "from-landing-accent/20 via-landing-accent/10 to-transparent",
      iconGradient: "from-landing-accent to-landing-accent",
      size: "lg",
    },
    {
      icon: GitBranch,
      title: t("landing.features.items.pipeline.title"),
      description: t("landing.features.items.pipeline.description"),
      gradient: "from-landing-accent/20 via-landing-accent/10 to-transparent",
      iconGradient: "from-landing-accent to-landing-accent",
      size: "md",
    },
    {
      icon: Users,
      title: t("landing.features.items.teamCollab.title"),
      description: t("landing.features.items.teamCollab.description"),
      gradient: "from-landing-accent/20 via-landing-accent/10 to-transparent",
      iconGradient: "from-landing-accent to-landing-accent",
      size: "sm",
    },
    {
      icon: BarChart3,
      title: t("landing.features.items.analytics.title"),
      description: t("landing.features.items.analytics.description"),
      gradient: "from-landing-accent/20 via-landing-accent/10 to-transparent",
      iconGradient: "from-landing-accent to-landing-accent",
      size: "sm",
    },
    {
      icon: Zap,
      title: t("landing.features.items.automation.title"),
      description: t("landing.features.items.automation.description"),
      gradient: "from-landing-accent/20 via-landing-accent/10 to-transparent",
      iconGradient: "from-landing-accent to-landing-accent",
      size: "md",
    },
    {
      icon: RefreshCw,
      title: t("landing.features.items.sync.title"),
      description: t("landing.features.items.sync.description"),
      gradient: "from-landing-accent/20 via-landing-accent/10 to-transparent",
      iconGradient: "from-landing-accent to-landing-accent",
      size: "lg",
    },
  ];

  return (
    <section id="features" className="relative py-24 sm:py-36 px-4 sm:px-6 overflow-hidden">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute top-[10%] left-1/2 -translate-x-1/2 h-[800px] w-[800px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(var(--landing-accent-rgb),0.08) 0%, transparent 70%)",
            filter: "blur(100px)",
          }}
        />
        <div
          className="absolute bottom-[10%] right-[10%] h-[500px] w-[500px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(var(--landing-accent-rgb),0.05) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
      </div>

      <div className="mx-auto max-w-6xl">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className="text-center mb-16 sm:mb-20"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 dark:border-white/10 bg-white/5 dark:bg-white/5 px-5 py-2 text-xs font-semibold tracking-wide text-muted-foreground backdrop-blur-xl mb-6">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            {t("landing.features.badge")}
          </span>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tighter text-foreground">
            {t("landing.features.title")}
            <br />
            <span className="landing-gradient-text bg-gradient-to-r from-landing-accent via-landing-accent to-landing-accent bg-clip-text text-transparent">
              {t("landing.features.titleHighlight")}
            </span>
          </h2>
          <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t("landing.features.subtitle")}
          </p>
        </motion.div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-5 auto-rows-auto">
          {features.map((feature, i) => (
            <BentoCard key={feature.title} feature={feature} index={i} learnMoreText={t("landing.features.learnMore")} />
          ))}
        </div>
      </div>
    </section>
  );
}
