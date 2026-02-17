"use client";

import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Sparkles, Clock, Users, Zap } from "lucide-react";

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

/* ---------- urgency countdown ---------- */
function UrgencyCountdown() {
  const [timeLeft, setTimeLeft] = useState({ hours: 23, minutes: 59, seconds: 59 });

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        let { hours, minutes, seconds } = prev;
        seconds--;
        if (seconds < 0) { seconds = 59; minutes--; }
        if (minutes < 0) { minutes = 59; hours--; }
        if (hours < 0) { hours = 23; minutes = 59; seconds = 59; }
        return { hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="flex items-center justify-center gap-3 mb-8"
    >
      <div className="flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/5 px-4 py-2 backdrop-blur-xl">
        <Clock className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-xs font-semibold text-amber-400">Limited offer ends in:</span>
        <div className="flex items-center gap-1 font-mono text-sm font-bold text-foreground">
          <span className="bg-white/10 rounded-md px-1.5 py-0.5">{pad(timeLeft.hours)}</span>
          <span className="text-amber-400">:</span>
          <span className="bg-white/10 rounded-md px-1.5 py-0.5">{pad(timeLeft.minutes)}</span>
          <span className="text-amber-400">:</span>
          <span className="bg-white/10 rounded-md px-1.5 py-0.5">{pad(timeLeft.seconds)}</span>
        </div>
      </div>
    </motion.div>
  );
}

/* ---------- live counter ---------- */
function LiveCounter() {
  const [count, setCount] = useState(10847);
  const tickRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      tickRef.current += 1;
      // Deterministic increment based on tick count (avoids Math.random in render)
      const increment = (tickRef.current % 3) + 1;
      setCount((prev) => prev + increment);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8 }}
      className="flex items-center justify-center gap-6 sm:gap-8 mt-8"
    >
      <div className="flex items-center gap-2">
        <div className="relative flex items-center">
          <span className="absolute inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </div>
        <span className="text-sm font-medium text-foreground">{count.toLocaleString()}</span>
        <span className="text-sm text-muted-foreground">teams signed up</span>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="w-3.5 h-3.5" />
        <span>47 joined today</span>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Zap className="w-3.5 h-3.5 text-amber-400" />
        <span>Free forever</span>
      </div>
    </motion.div>
  );
}

/* ---------- floating particles ---------- */
// Pre-computed particle positions to avoid Math.random() during SSR/hydration
const PARTICLES = Array.from({ length: 40 }, (_, i) => ({
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
                Start for free today
              </div>

              {/* Urgency countdown */}
              <UrgencyCountdown />

              {/* Heading */}
              <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter text-foreground mb-6">
                Ready to supercharge
                <br className="hidden sm:block" />
                <span className="landing-gradient-text bg-gradient-to-r from-landing-accent via-landing-accent to-landing-accent bg-clip-text text-transparent">
                  {" "}your sales?
                </span>
              </h2>

              {/* Subtitle */}
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
                Join 10,000+ teams already using Nexxus CRM to close more deals, faster. Free forever — no credit card required.
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
                    className="landing-pulse-button group relative inline-flex items-center gap-2.5 h-14 sm:h-16 px-10 sm:px-12 rounded-2xl text-base sm:text-lg font-semibold bg-gradient-to-r from-landing-accent via-landing-accent to-landing-accent text-white shadow-2xl shadow-landing-accent/25 transition-shadow hover:shadow-landing-accent/40"
                  >
                    Get Started Free
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
                    View Pricing
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
                {[
                  { text: "No credit card", icon: "💳" },
                  { text: "Free forever", icon: "✨" },
                  { text: "Setup in 2 min", icon: "⚡" },
                  { text: "Cancel anytime", icon: "🔓" },
                ].map((item) => (
                  <motion.span
                    key={item.text}
                    whileHover={{ scale: 1.05, y: -2 }}
                    className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-xl cursor-default"
                  >
                    <span>{item.icon}</span>
                    <span className="font-medium">{item.text}</span>
                  </motion.span>
                ))}
              </motion.div>

              {/* Live counter */}
              <LiveCounter />
            </motion.div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
