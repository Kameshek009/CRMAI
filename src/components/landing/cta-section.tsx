// FILE: cta-section.tsx
"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

/* ---------- aurora background ---------- */
function AuroraBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Aurora layers */}
      <motion.div
        animate={{
          x: [0, 100, -50, 80, 0],
          y: [0, -30, 20, -10, 0],
          scale: [1, 1.2, 0.9, 1.1, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-[40%] -left-[20%] h-[600px] w-[800px] rounded-full"
        style={{
          background: "radial-gradient(ellipse, rgba(var(--landing-accent-rgb),0.25) 0%, rgba(var(--landing-accent-rgb),0.1) 40%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />
      <motion.div
        animate={{
          x: [0, -80, 40, -60, 0],
          y: [0, 40, -20, 30, 0],
          scale: [1, 0.9, 1.15, 1, 1],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        className="absolute -bottom-[30%] -right-[15%] h-[500px] w-[700px] rounded-full"
        style={{
          background: "radial-gradient(ellipse, rgba(var(--landing-accent-rgb),0.2) 0%, rgba(var(--landing-accent-rgb),0.08) 40%, transparent 70%)",
          filter: "blur(100px)",
        }}
      />
      <motion.div
        animate={{
          x: [0, 50, -30, 0],
          y: [0, -50, 30, 0],
          rotate: [0, 10, -5, 0],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 5 }}
        className="absolute top-[10%] right-[20%] h-[400px] w-[400px] rounded-full"
        style={{
          background: "radial-gradient(ellipse, rgba(var(--landing-accent-rgb),0.15) 0%, rgba(var(--landing-accent-rgb),0.06) 40%, transparent 70%)",
          filter: "blur(90px)",
        }}
      />
      <motion.div
        animate={{
          x: [0, -40, 60, 0],
          y: [0, 30, -40, 0],
        }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 8 }}
        className="absolute bottom-[20%] left-[30%] h-[300px] w-[500px] rounded-full"
        style={{
          background: "radial-gradient(ellipse, rgba(var(--landing-accent-rgb),0.12) 0%, rgba(var(--landing-accent-rgb),0.05) 40%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />
    </div>
  );
}

/* ---------- animated gradient mesh for CTA ---------- */
function CTAGradientMesh() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        animate={{
          background: [
            "radial-gradient(at 10% 20%, rgba(var(--landing-accent-rgb),0.12) 0%, transparent 50%), radial-gradient(at 90% 80%, rgba(var(--landing-accent-rgb),0.10) 0%, transparent 50%), radial-gradient(at 50% 50%, rgba(var(--landing-accent-rgb),0.08) 0%, transparent 50%)",
            "radial-gradient(at 50% 80%, rgba(var(--landing-accent-rgb),0.10) 0%, transparent 50%), radial-gradient(at 20% 30%, rgba(var(--landing-accent-rgb),0.12) 0%, transparent 50%), radial-gradient(at 80% 20%, rgba(var(--landing-accent-rgb),0.08) 0%, transparent 50%)",
            "radial-gradient(at 80% 40%, rgba(var(--landing-accent-rgb),0.10) 0%, transparent 50%), radial-gradient(at 30% 70%, rgba(var(--landing-accent-rgb),0.12) 0%, transparent 50%), radial-gradient(at 60% 10%, rgba(var(--landing-accent-rgb),0.08) 0%, transparent 50%)",
            "radial-gradient(at 10% 20%, rgba(var(--landing-accent-rgb),0.12) 0%, transparent 50%), radial-gradient(at 90% 80%, rgba(var(--landing-accent-rgb),0.10) 0%, transparent 50%), radial-gradient(at 50% 50%, rgba(var(--landing-accent-rgb),0.08) 0%, transparent 50%)",
          ],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0"
      />
    </div>
  );
}

/* ---------- floating particles ---------- */
// Pre-computed particle positions to avoid Math.random() during SSR/hydration
const PARTICLES = Array.from({ length: 15 }, (_, i) => ({
  id: i,
  x: ((i * 37 + 13) % 100),
  y: ((i * 53 + 7) % 100),
  size: 1 + (i % 3),
  duration: 15 + (i % 10),
  delay: (i % 5),
  opacity: 0.15 + ((i % 4) * 0.05),
}));

function FloatingParticles() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {PARTICLES.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            background: `rgba(var(--landing-accent-rgb), ${p.opacity})`,
          }}
          animate={{
            y: [0, -40, 15, -25, 0],
            x: [0, 20, -15, 8, 0],
            opacity: [0.1, 0.5, 0.2, 0.4, 0.1],
            scale: [1, 1.5, 0.8, 1.2, 1],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

export function CTASection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const scale = useTransform(scrollYProgress, [0, 0.5], [0.92, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.3], [0, 1]);
  const { t } = useTranslation();

  const badges = [
    { text: t("landing.cta.badges.noCreditCard") },
    { text: t("landing.cta.badges.freeForever") },
    { text: t("landing.cta.badges.setupIn2Min") },
    { text: t("landing.cta.badges.cancelAnytime") },
  ];

  return (
    <section
      id="cta"
      ref={ref}
      className="relative py-24 sm:py-36 px-4 sm:px-6 overflow-hidden"
    >
      <motion.div style={{ scale, opacity }} className="mx-auto max-w-5xl">
        <div className="relative rounded-[2rem] overflow-hidden p-1">
          {/* Animated gradient border */}
          <div
            className="absolute inset-0 rounded-[2rem] landing-gradient-border"
            style={{
              background:
                "linear-gradient(135deg, var(--landing-accent), var(--landing-accent), var(--landing-accent), var(--landing-accent), var(--landing-accent))",
              backgroundSize: "400% 400%",
            }}
          />

          {/* Inner card */}
          <div className="relative rounded-[calc(2rem-4px)] bg-background/95 dark:bg-[#0a0a0a]/95 backdrop-blur-xl p-10 sm:p-16 md:p-20 text-center overflow-hidden">
            {/* Aurora + gradient mesh background */}
            <AuroraBackground />
            <CTAGradientMesh />
            <FloatingParticles />

            {/* Grid pattern */}
            <div className="pointer-events-none absolute inset-0">
              <svg className="absolute inset-0 h-full w-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="cta-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                    <path d="M 30 0 L 0 0 0 30" fill="none" stroke="currentColor" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#cta-grid)" />
              </svg>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
              className="relative z-10"
            >
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-landing-accent/30 bg-landing-accent/10 px-5 py-2 text-xs font-semibold text-landing-accent mb-8">
                <Sparkles className="w-3.5 h-3.5" />
                {t("landing.cta.badge")}
              </div>

              {/* Heading */}
              <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter text-foreground mb-6">
                {t("landing.cta.title")}
                <br className="hidden sm:block" />
                <span className="landing-gradient-text bg-gradient-to-r from-landing-accent via-landing-accent to-landing-accent bg-clip-text text-transparent">
                  {" "}{t("landing.cta.titleHighlight")}
                </span>
              </h2>

              {/* Subtitle */}
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
                {t("landing.cta.subtitle")}
              </p>

              {/* CTA buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <motion.div
                  whileHover={{ scale: 1.04, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <Link
                    href="/sign-up"
                    className="landing-pulse-button group relative inline-flex items-center gap-2.5 h-14 sm:h-16 px-10 sm:px-12 rounded-2xl text-base sm:text-lg font-semibold bg-gradient-to-r from-landing-accent via-landing-accent to-landing-accent text-landing-accent-foreground shadow-2xl shadow-landing-accent/25 transition-shadow hover:shadow-landing-accent/40"
                  >
                    {t("landing.cta.ctaPrimary")}
                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.04, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <Link
                    href="#pricing"
                    className="inline-flex items-center gap-2.5 h-14 sm:h-16 px-10 sm:px-12 rounded-2xl text-base sm:text-lg font-semibold border border-white/15 dark:border-white/15 bg-white/5 dark:bg-white/5 text-foreground backdrop-blur-xl hover:bg-white/10 dark:hover:bg-white/10 transition-all"
                  >
                    {t("landing.cta.ctaSecondary")}
                  </Link>
                </motion.div>
              </div>

              {/* Trust badges */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={inView ? { opacity: 1 } : {}}
                transition={{ delay: 0.5 }}
                className="mt-10 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-muted-foreground/60"
              >
                {badges.map((item) => (
                  <motion.span
                    key={item.text}
                    whileHover={{ scale: 1.05, y: -2 }}
                    className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-xl cursor-default"
                  >
                    <span className="font-medium">{item.text}</span>
                  </motion.span>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
