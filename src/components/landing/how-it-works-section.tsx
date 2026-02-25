"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { UserPlus, GitBranch, Sparkles } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

const stepIcons = [UserPlus, GitBranch, Sparkles];
const stepKeys = ["signUp", "setup", "close"] as const;

export function HowItWorksSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const { t } = useTranslation();

  return (
    <section
      id="how-it-works"
      ref={ref}
      className="relative py-24 sm:py-36 px-4 sm:px-6 overflow-hidden"
    >
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[800px] rounded-full"
          style={{
            background: "radial-gradient(ellipse, rgba(var(--landing-accent-rgb),0.06) 0%, rgba(var(--landing-accent-rgb),0.03) 40%, transparent 70%)",
            filter: "blur(100px)",
          }}
        />
      </div>

      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className="text-center mb-16 sm:mb-20"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 dark:border-white/10 bg-white/5 dark:bg-white/5 px-5 py-2 text-xs font-semibold tracking-wide text-muted-foreground backdrop-blur-xl mb-6">
            <GitBranch className="w-3.5 h-3.5 text-amber-400" />
            {t("landing.howItWorks.badge")}
          </span>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tighter text-foreground">
            {t("landing.howItWorks.title")}
            <br />
            <span className="landing-gradient-text bg-gradient-to-r from-landing-accent via-landing-accent to-landing-accent bg-clip-text text-transparent">
              {t("landing.howItWorks.titleHighlight")}
            </span>
          </h2>
          <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t("landing.howItWorks.subtitle")}
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-1/2 left-0 right-0 h-px -translate-y-1/2">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={inView ? { scaleX: 1 } : {}}
              transition={{ duration: 1.5, delay: 0.3, ease: "easeOut" }}
              className="h-px w-full bg-gradient-to-r from-transparent via-landing-accent/30 to-transparent origin-left"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
            {stepKeys.map((key, i) => {
              const Icon = stepIcons[i];
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 40, scale: 0.95 }}
                  animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
                  transition={{
                    delay: 0.2 + i * 0.15,
                    type: "spring",
                    stiffness: 150,
                    damping: 22,
                  }}
                  className="group relative"
                >
                  <div className="relative rounded-3xl border border-white/10 dark:border-white/10 bg-white/[0.03] dark:bg-white/[0.03] backdrop-blur-xl p-8 sm:p-10 text-center hover:border-white/20 dark:hover:border-white/20 transition-all duration-300 hover:shadow-2xl hover:shadow-landing-accent/5">
                    {/* Background glow on hover */}
                    <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-landing-accent/20 via-landing-accent/10 to-transparent opacity-0 group-hover:opacity-40 transition-opacity duration-500" />

                    {/* Step number */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={inView ? { scale: 1 } : {}}
                      transition={{ delay: 0.4 + i * 0.15, type: "spring", stiffness: 200, damping: 15 }}
                      className="relative z-10 mx-auto mb-6"
                    >
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-landing-accent to-landing-accent flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow mx-auto">
                        <Icon className="w-7 h-7 text-landing-accent-foreground" />
                      </div>
                      {/* Pulse ring */}
                      <div className="absolute inset-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-landing-accent to-landing-accent opacity-0 group-hover:opacity-30 group-hover:scale-[1.5] transition-all duration-700 blur-md mx-auto" />
                    </motion.div>

                    {/* Step indicator */}
                    <span className="relative z-10 inline-flex items-center justify-center w-8 h-8 rounded-full border border-landing-accent/30 bg-landing-accent/10 text-xs font-bold text-landing-accent mb-4">
                      {t(`landing.howItWorks.steps.${key}.step`)}
                    </span>

                    <h3 className="relative z-10 text-xl sm:text-2xl font-bold tracking-tight text-foreground mb-3">
                      {t(`landing.howItWorks.steps.${key}.title`)}
                    </h3>

                    <p className="relative z-10 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-sm mx-auto">
                      {t(`landing.howItWorks.steps.${key}.description`)}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
