"use client";

import Link from "next/link";
import { useEffect, useState, useRef, useCallback } from "react";
import { motion, useMotionValue, useTransform, animate, useSpring } from "framer-motion";
import { ArrowRight, Sparkles, TrendingUp, Users, DollarSign, BarChart3, Zap } from "lucide-react";

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
      <motion.div
        animate={{ x: [0, 80, -40, 0], y: [0, -60, 40, 0], scale: [1, 1.15, 0.95, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-15%] left-[40%] h-[700px] w-[700px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(var(--landing-accent-rgb),0.18) 0%, rgba(var(--landing-accent-rgb),0.10) 50%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />
      <motion.div
        animate={{ x: [0, -60, 30, 0], y: [0, 50, -30, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute top-[10%] left-[10%] h-[500px] w-[500px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(var(--landing-accent-rgb),0.15) 0%, rgba(var(--landing-accent-rgb),0.08) 50%, transparent 70%)",
          filter: "blur(100px)",
        }}
      />
      <motion.div
        animate={{ x: [0, 50, -70, 0], y: [0, -40, 60, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        className="absolute top-[20%] right-[5%] h-[400px] w-[400px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(var(--landing-accent-rgb),0.12) 0%, rgba(var(--landing-accent-rgb),0.06) 50%, transparent 70%)",
          filter: "blur(90px)",
        }}
      />
      <motion.div
        animate={{ x: [0, -30, 50, 0], y: [0, 30, -50, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 6 }}
        className="absolute bottom-[5%] left-[25%] h-[350px] w-[350px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(var(--landing-accent-rgb),0.10) 0%, rgba(var(--landing-accent-rgb),0.05) 50%, transparent 70%)",
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

/* ---------- animated beam rays ---------- */
function BeamRays() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* Beam 1 - top left to center */}
      <motion.div
        animate={{ opacity: [0, 0.4, 0], x: ["-100%", "200%"] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 0 }}
        className="absolute top-[20%] left-0 h-[1px] w-[300px]"
        style={{ background: "linear-gradient(90deg, transparent, rgba(var(--landing-accent-rgb),0.6), transparent)" }}
      />
      {/* Beam 2 - top right diagonal */}
      <motion.div
        animate={{ opacity: [0, 0.3, 0], x: ["200%", "-100%"] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        className="absolute top-[35%] right-0 h-[1px] w-[400px]"
        style={{ background: "linear-gradient(90deg, transparent, rgba(var(--landing-accent-rgb),0.5), transparent)", transform: "rotate(-15deg)" }}
      />
      {/* Beam 3 - vertical subtle */}
      <motion.div
        animate={{ opacity: [0, 0.2, 0], y: ["-100%", "200%"] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 5 }}
        className="absolute top-0 left-[60%] w-[1px] h-[200px]"
        style={{ background: "linear-gradient(180deg, transparent, rgba(var(--landing-accent-rgb),0.4), transparent)" }}
      />
      {/* Wide beam glow */}
      <motion.div
        animate={{ opacity: [0, 0.15, 0], rotate: [0, 3, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-20%] left-[30%] w-[2px] h-[140%]"
        style={{ background: "linear-gradient(180deg, transparent, rgba(var(--landing-accent-rgb),0.3), rgba(var(--landing-accent-rgb),0.2), transparent)", filter: "blur(4px)" }}
      />
    </div>
  );
}

/* ---------- animated gradient mesh ---------- */
function GradientMesh() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-20 overflow-hidden">
      <motion.div
        animate={{
          background: [
            "radial-gradient(at 20% 30%, rgba(var(--landing-accent-rgb),0.08) 0%, transparent 50%), radial-gradient(at 80% 70%, rgba(var(--landing-accent-rgb),0.06) 0%, transparent 50%), radial-gradient(at 50% 50%, rgba(var(--landing-accent-rgb),0.04) 0%, transparent 50%)",
            "radial-gradient(at 40% 60%, rgba(var(--landing-accent-rgb),0.06) 0%, transparent 50%), radial-gradient(at 60% 30%, rgba(var(--landing-accent-rgb),0.08) 0%, transparent 50%), radial-gradient(at 30% 80%, rgba(var(--landing-accent-rgb),0.06) 0%, transparent 50%)",
            "radial-gradient(at 70% 40%, rgba(var(--landing-accent-rgb),0.07) 0%, transparent 50%), radial-gradient(at 30% 50%, rgba(var(--landing-accent-rgb),0.05) 0%, transparent 50%), radial-gradient(at 60% 70%, rgba(var(--landing-accent-rgb),0.05) 0%, transparent 50%)",
            "radial-gradient(at 20% 30%, rgba(var(--landing-accent-rgb),0.08) 0%, transparent 50%), radial-gradient(at 80% 70%, rgba(var(--landing-accent-rgb),0.06) 0%, transparent 50%), radial-gradient(at 50% 50%, rgba(var(--landing-accent-rgb),0.04) 0%, transparent 50%)",
          ],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0"
      />
    </div>
  );
}

/* ---------- mouse spotlight ---------- */
function MouseSpotlight() {
  const spotlightRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { stiffness: 100, damping: 30 });
  const smoothY = useSpring(mouseY, { stiffness: 100, damping: 30 });

  const backgroundValue = useTransform(
    [smoothX, smoothY],
    ([x, y]) =>
      `radial-gradient(600px circle at ${x}px ${y}px, rgba(var(--landing-accent-rgb),0.06), rgba(var(--landing-accent-rgb),0.03), transparent 60%)`
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <motion.div
      ref={spotlightRef}
      className="pointer-events-none fixed inset-0 z-0 opacity-60"
      style={{ background: backgroundValue }}
    />
  );
}

/* ---------- 3D product mockup ---------- */
function ProductPreview3D() {
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-300, 300], [8, -8]), { stiffness: 150, damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [-300, 300], [-8, 8]), { stiffness: 150, damping: 20 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  }, [mouseX, mouseY]);

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY]);

  const miniDeals = [
    { name: "Acme Corp", value: "$45,000", change: "+12%", status: "Hot" },
    { name: "Globex Inc", value: "$28,500", change: "+8%", status: "Warm" },
    { name: "Wayne Ent", value: "$31,200", change: "+24%", status: "Hot" },
    { name: "Stark Ltd", value: "$18,750", change: "+5%", status: "New" },
  ];

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, y: 60, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.6, duration: 0.8, type: "spring", stiffness: 100, damping: 20 }}
      style={{ rotateX, rotateY, transformPerspective: 1200 }}
      className="relative w-full max-w-4xl mx-auto mt-12 sm:mt-16"
    >
      {/* Glow behind */}
      <div className="absolute -inset-8 -z-10 rounded-3xl" style={{
        background: "radial-gradient(ellipse at center, rgba(var(--landing-accent-rgb),0.15) 0%, rgba(var(--landing-accent-rgb),0.08) 30%, transparent 70%)",
        filter: "blur(50px)",
      }} />

      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="rounded-2xl sm:rounded-3xl border border-white/10 dark:border-white/10 bg-white/[0.03] dark:bg-white/[0.03] backdrop-blur-2xl shadow-2xl overflow-hidden"
      >
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 border-b border-white/10 dark:border-white/10 bg-white/[0.02]">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400/80" />
            <div className="w-3 h-3 rounded-full bg-amber-400/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
          </div>
          <span className="text-[11px] text-muted-foreground font-medium ml-2">Nexxus CRM — Dashboard</span>
          <div className="ml-auto flex items-center gap-2">
            <div className="h-5 w-24 rounded-md bg-white/5 border border-white/10" />
          </div>
        </div>

        <div className="flex min-h-[280px] sm:min-h-[340px]">
          {/* Sidebar */}
          <div className="hidden sm:flex w-[52px] border-r border-white/10 bg-white/[0.02] flex-col items-center py-4 gap-3">
            {[BarChart3, Users, DollarSign, Zap].map((Icon, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1 + i * 0.1 }}
                className={`w-8 h-8 rounded-xl flex items-center justify-center ${i === 0 ? "bg-gradient-to-br from-landing-accent to-landing-accent shadow-lg" : "hover:bg-white/5"} transition-colors`}
              >
                <Icon className={`w-4 h-4 ${i === 0 ? "text-landing-accent-foreground" : "text-muted-foreground/50"}`} />
              </motion.div>
            ))}
          </div>

          {/* Main content */}
          <div className="flex-1 p-4 sm:p-5">
            {/* Top stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: "Revenue", value: "$1.2M", change: "+18%", color: "from-landing-accent to-landing-accent" },
                { label: "Deals Won", value: "148", change: "+24%", color: "from-landing-accent to-landing-accent" },
                { label: "Conversion", value: "68%", change: "+7%", color: "from-landing-accent to-landing-accent" },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 + i * 0.1 }}
                  className="rounded-xl border border-white/10 bg-white/[0.02] p-3"
                >
                  <p className="text-[10px] text-muted-foreground/60 mb-1">{stat.label}</p>
                  <p className="text-base sm:text-lg font-bold text-foreground">{stat.value}</p>
                  <span className={`text-[10px] font-semibold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                    {stat.change}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* Deals table */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
              <div className="grid grid-cols-4 gap-2 px-3 py-2 border-b border-white/10">
                {["Deal", "Value", "Growth", "Status"].map(h => (
                  <span key={h} className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/50">{h}</span>
                ))}
              </div>
              {miniDeals.map((deal, i) => (
                <motion.div
                  key={deal.name}
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.2 + i * 0.08 }}
                  className="grid grid-cols-4 gap-2 px-3 py-2 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
                >
                  <span className="text-[11px] font-medium text-foreground/80 truncate">{deal.name}</span>
                  <span className="text-[11px] font-semibold text-foreground">{deal.value}</span>
                  <span className="text-[11px] font-semibold text-emerald-400">{deal.change}</span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md w-fit ${
                    deal.status === "Hot" ? "bg-rose-500/10 text-rose-400"
                    : deal.status === "Warm" ? "bg-amber-500/10 text-amber-400"
                    : "bg-blue-500/10 text-blue-400"
                  }`}>{deal.status}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right panel - mini chart */}
          <div className="hidden lg:flex w-[180px] border-l border-white/10 bg-white/[0.02] flex-col p-4 gap-3">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4 }}
            >
              <p className="text-[10px] text-muted-foreground/60 mb-2">Revenue Trend</p>
              <div className="flex items-end gap-1 h-16">
                {[35, 45, 38, 52, 48, 65, 58, 72, 68, 85, 78, 92].map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ delay: 1.5 + i * 0.05, duration: 0.5, ease: "easeOut" }}
                    className="flex-1 rounded-sm bg-gradient-to-t from-landing-accent/40 to-landing-accent/60"
                  />
                ))}
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.8 }}
              className="flex items-center gap-2 mt-2"
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] font-semibold text-emerald-400">+42% MoM</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2 }}
              className="mt-auto rounded-xl bg-gradient-to-br from-landing-accent/10 to-landing-accent/10 border border-landing-accent/20 p-3"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3 h-3 text-landing-accent" />
                <span className="text-[9px] font-bold text-landing-accent">AI INSIGHT</span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                3 deals need follow-up this week. Expected close rate: 78%
              </p>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Reflection effect */}
      <div className="hidden sm:block absolute -bottom-12 left-[5%] right-[5%] h-16 rounded-full"
        style={{
          background: "radial-gradient(ellipse, rgba(var(--landing-accent-rgb),0.08) 0%, transparent 70%)",
          filter: "blur(20px)",
        }}
      />
    </motion.div>
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

/* ---------- typed text effect ---------- */
function TypedText({ words }: { words: string[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % words.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [words.length]);

  return (
    <span className="relative inline-block min-w-[200px] sm:min-w-[280px]" aria-live="polite" aria-atomic="true">
      {words.map((word, i) => (
        <motion.span
          key={word}
          initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
          animate={{
            opacity: i === currentIndex ? 1 : 0,
            y: i === currentIndex ? 0 : -20,
            filter: i === currentIndex ? "blur(0px)" : "blur(8px)",
          }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`landing-gradient-text bg-gradient-to-r from-landing-accent via-landing-accent to-landing-accent bg-clip-text text-transparent ${i === currentIndex ? "relative" : "absolute left-0 top-0"}`}
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}

export function HeroSection() {
  return (
    <section className="relative min-h-[100dvh] flex flex-col items-center justify-center overflow-hidden px-4 sm:px-6 pt-20 pb-12 sm:pt-28 sm:pb-20">
      <GradientMesh />
      <FloatingOrbs />
      <GridPattern />
      <BeamRays />
      <MouseSpotlight />

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
          <motion.span
            className="landing-glass-badge inline-flex items-center gap-2.5 rounded-full border border-white/10 dark:border-white/10 bg-white/5 dark:bg-white/5 px-5 py-2 text-xs font-semibold tracking-wide text-muted-foreground backdrop-blur-xl shadow-lg cursor-default"
            whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(var(--landing-accent-rgb),0.15)" }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Now with AI-Powered Insights
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          </motion.span>
        </motion.div>

        {/* Main heading with typed text */}
        <motion.h1
          variants={itemVariants}
          className="text-5xl sm:text-7xl md:text-8xl lg:text-[6.5rem] font-bold tracking-tighter leading-[0.95]"
        >
          <span className="landing-shimmer-text bg-gradient-to-r from-foreground via-foreground/80 to-foreground bg-clip-text text-transparent">
            Nexxus
          </span>
          <br />
          <TypedText words={["CRM", "Sales", "Growth", "Revenue"]} />
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={itemVariants}
          className="text-lg sm:text-xl md:text-2xl text-muted-foreground max-w-2xl leading-relaxed font-light"
        >
          The AI-powered CRM that helps you{" "}
          <span className="text-foreground font-medium relative">
            close more deals
            <motion.span
              className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-landing-accent via-landing-accent to-landing-accent rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ delay: 1.5, duration: 0.8, ease: "easeOut" }}
            />
          </span>, nurture deeper relationships, and scale revenue —{" "}
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
              className="landing-glow-button group relative inline-flex items-center gap-2.5 h-14 px-10 rounded-2xl text-base font-semibold bg-gradient-to-r from-landing-accent via-landing-accent to-landing-accent text-landing-accent-foreground shadow-2xl shadow-landing-accent/25 transition-shadow hover:shadow-landing-accent/40"
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
              See Features
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
          className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-10 mt-4 sm:mt-6 pt-8 sm:pt-10 border-t border-white/10 dark:border-white/10 w-full max-w-3xl"
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

      {/* 3D Product Preview */}
      <ProductPreview3D />

      {/* Bottom fade gradient */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
