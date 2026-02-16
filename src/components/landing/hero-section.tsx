"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { ArrowRight, Sparkles, Play } from "lucide-react";

/* ---------- animated counter ---------- */
function AnimatedNumber({ target, suffix = "" }: { target: number; suffix?: string }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => {
    if (target >= 1000) return `${Math.round(v / 1000)}K`;
    return Math.round(v).toString();
  });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    const controls = animate(count, target, { duration: 2.2, ease: "easeOut" });
    const unsub = rounded.on("change", (v) => setDisplay(v));
    return () => { controls.stop(); unsub(); };
  }, [count, target, rounded]);

  return (
    <span>
      {display}
      {suffix}
    </span>
  );
}

/* ---------- floating orbs ---------- */
function FloatingOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* Large primary orb */}
      <motion.div
        animate={{ x: [0, 80, -40, 0], y: [0, -60, 40, 0], scale: [1, 1.15, 0.95, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-15%] left-[40%] h-[700px] w-[700px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(126,196,227,0.15) 0%, rgba(167,139,250,0.08) 50%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />
      {/* Purple accent orb */}
      <motion.div
        animate={{ x: [0, -60, 30, 0], y: [0, 50, -30, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute top-[10%] left-[10%] h-[500px] w-[500px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(167,139,250,0.12) 0%, rgba(244,114,182,0.06) 50%, transparent 70%)",
          filter: "blur(100px)",
        }}
      />
      {/* Pink accent orb */}
      <motion.div
        animate={{ x: [0, 50, -70, 0], y: [0, -40, 60, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        className="absolute top-[20%] right-[5%] h-[400px] w-[400px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(244,114,182,0.10) 0%, rgba(126,234,155,0.05) 50%, transparent 70%)",
          filter: "blur(90px)",
        }}
      />
      {/* Green subtle orb */}
      <motion.div
        animate={{ x: [0, -30, 50, 0], y: [0, 30, -50, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 6 }}
        className="absolute bottom-[5%] left-[25%] h-[350px] w-[350px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(126,234,155,0.08) 0%, rgba(126,196,227,0.04) 50%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />
    </div>
  );
}

/* ---------- grid pattern overlay ---------- */
function GridPattern() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10">
      <svg className="absolute inset-0 h-full w-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="hero-grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="currentColor" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-grid)" />
      </svg>
    </div>
  );
}

/* ---------- stats items ---------- */
const stats = [
  { value: 10000, suffix: "+", label: "Active Users" },
  { value: 99, suffix: ".9%", label: "Uptime" },
  { value: 150, suffix: "M+", label: "Deals Tracked" },
  { value: 4, suffix: ".9/5", label: "User Rating" },
];

/* ---------- container animations ---------- */
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30, filter: "blur(10px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring" as const, stiffness: 200, damping: 25 },
  },
};

export function HeroSection() {
  return (
    <section className="relative min-h-[100dvh] flex flex-col items-center justify-center overflow-hidden px-4 sm:px-6 pt-20 pb-12 sm:pt-28 sm:pb-20">
      <FloatingOrbs />
      <GridPattern />

      {/* Radial gradient fade at edges */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 40%, transparent 0%, var(--background) 100%)",
        }}
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex flex-col items-center text-center gap-8 max-w-5xl mx-auto"
      >
        {/* Badge */}
        <motion.div variants={itemVariants}>
          <span className="landing-glass-badge inline-flex items-center gap-2.5 rounded-full border border-white/10 dark:border-white/10 bg-white/5 dark:bg-white/5 px-5 py-2 text-xs font-semibold tracking-wide text-muted-foreground backdrop-blur-xl shadow-lg">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Now with AI-Powered Insights
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          </span>
        </motion.div>

        {/* Main heading with shimmer */}
        <motion.h1
          variants={itemVariants}
          className="text-5xl sm:text-7xl md:text-8xl lg:text-[6.5rem] font-bold tracking-tighter leading-[0.95]"
        >
          <span className="landing-shimmer-text bg-gradient-to-r from-foreground via-foreground/80 to-foreground bg-clip-text text-transparent">
            Nexxus
          </span>
          <br />
          <span className="landing-gradient-text bg-gradient-to-r from-[#7ec4e3] via-[#a78bfa] to-[#f472b6] bg-clip-text text-transparent">
            CRM
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={itemVariants}
          className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-2xl leading-relaxed font-light"
        >
          The AI-powered CRM that helps you close more deals, nurture deeper relationships, and scale revenue —{" "}
          <span className="text-foreground font-medium">effortlessly</span>.
        </motion.p>

        {/* CTA buttons */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center gap-4 mt-2">
          <motion.div
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <Link
              href="/sign-up"
              className="landing-glow-button group relative inline-flex items-center gap-2.5 h-14 px-10 rounded-2xl text-base font-semibold bg-gradient-to-r from-[#7ec4e3] via-[#a78bfa] to-[#f472b6] text-white shadow-2xl shadow-purple-500/25 transition-shadow hover:shadow-purple-500/40"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <Link
              href="#features"
              className="group relative inline-flex items-center gap-2.5 h-14 px-10 rounded-2xl text-base font-semibold border border-white/15 dark:border-white/15 bg-white/5 dark:bg-white/5 text-foreground backdrop-blur-xl hover:bg-white/10 dark:hover:bg-white/10 transition-all"
            >
              <Play className="w-4 h-4" />
              Watch Demo
            </Link>
          </motion.div>
        </motion.div>

        {/* Sub-CTA text */}
        <motion.p variants={itemVariants} className="text-sm text-muted-foreground">
          Free forever. No credit card required.
        </motion.p>

        {/* Stats row */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-10 mt-8 sm:mt-12 pt-8 sm:pt-10 border-t border-white/10 dark:border-white/10 w-full max-w-3xl"
        >
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-1">
              <span className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-transparent">
                <AnimatedNumber target={stat.value} suffix={stat.suffix} />
              </span>
              <span className="text-xs sm:text-sm text-muted-foreground font-medium">{stat.label}</span>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Bottom fade gradient */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
