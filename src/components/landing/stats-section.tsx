"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useTransform, animate, useInView } from "framer-motion";
import { useRef } from "react";

interface StatItem {
  value: number;
  suffix: string;
  label: string;
  description: string;
  gradient: string;
  gradientColors: [string, string];
  progress: number; // 0-100 for the ring
}

const stats: StatItem[] = [
  {
    value: 3,
    suffix: "x",
    label: "More Deals Closed",
    description: "Teams using Nexxus CRM close 3x more deals on average",
    gradient: "from-[#7ec4e3] to-[#a78bfa]",
    gradientColors: ["#7ec4e3", "#a78bfa"],
    progress: 95,
  },
  {
    value: 85,
    suffix: "%",
    label: "Less Manual Work",
    description: "AI automations eliminate repetitive data entry and follow-ups",
    gradient: "from-[#a78bfa] to-[#f472b6]",
    gradientColors: ["#a78bfa", "#f472b6"],
    progress: 85,
  },
  {
    value: 40,
    suffix: "%",
    label: "Faster Sales Cycle",
    description: "Shorten your pipeline with AI-powered insights and scoring",
    gradient: "from-[#f472b6] to-[#f2b76c]",
    gradientColors: ["#f472b6", "#f2b76c"],
    progress: 72,
  },
  {
    value: 10,
    suffix: "K+",
    label: "Teams Trust Us",
    description: "Growing businesses worldwide choose Nexxus CRM",
    gradient: "from-[#7eea9b] to-[#7ec4e3]",
    gradientColors: ["#7eea9b", "#7ec4e3"],
    progress: 88,
  },
];

function AnimatedStatNumber({
  value,
  suffix,
  gradient,
  inView,
}: {
  value: number;
  suffix: string;
  gradient: string;
  inView: boolean;
}) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v).toString());
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!inView) return;
    const controls = animate(count, value, { duration: 2, ease: "easeOut" });
    const unsub = rounded.on("change", (v) => setDisplay(v));
    return () => {
      controls.stop();
      unsub();
    };
  }, [inView, count, value, rounded]);

  return (
    <span
      className={`text-4xl sm:text-5xl md:text-6xl font-bold tracking-tighter bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}
    >
      {display}
      {suffix}
    </span>
  );
}

/* ---------- SVG Progress Ring ---------- */
function ProgressRing({
  progress,
  gradientColors,
  inView,
  index,
}: {
  progress: number;
  gradientColors: [string, string];
  inView: boolean;
  index: number;
}) {
  const gradientId = `ring-gradient-${index}`;
  const size = 100;
  const strokeWidth = 4;
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;

  return (
    <svg width={size} height={size} className="absolute -inset-1 pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity duration-500">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={gradientColors[0]} />
          <stop offset="100%" stopColor={gradientColors[1]} />
        </linearGradient>
      </defs>
      {/* Background circle */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-white/5"
      />
      {/* Animated progress circle */}
      <motion.circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={inView ? { strokeDashoffset: circumference - (circumference * progress) / 100 } : {}}
        transition={{ duration: 2, delay: index * 0.15, ease: "easeOut" }}
        transform={`rotate(-90 ${center} ${center})`}
      />
    </svg>
  );
}

export function StatsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      id="stats"
      ref={ref}
      className="relative py-24 sm:py-36 px-4 sm:px-6 overflow-hidden"
    >
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[1000px] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse, rgba(126,196,227,0.08) 0%, rgba(167,139,250,0.04) 40%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
      </div>

      {/* Grid pattern */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <svg className="absolute inset-0 h-full w-full opacity-[0.02]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="stats-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="currentColor" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#stats-grid)" />
        </svg>
      </div>

      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className="text-center mb-16 sm:mb-24"
        >
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tighter text-foreground">
            The numbers speak
            <br />
            <span className="landing-gradient-text bg-gradient-to-r from-[#7eea9b] via-[#7ec4e3] to-[#a78bfa] bg-clip-text text-transparent">
              for themselves
            </span>
          </h2>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{
                delay: i * 0.12,
                type: "spring",
                stiffness: 150,
                damping: 22,
              }}
              className="group relative text-center p-8 sm:p-10 rounded-3xl border border-white/10 dark:border-white/10 bg-white/[0.02] dark:bg-white/[0.02] backdrop-blur-xl hover:border-white/20 dark:hover:border-white/20 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/5"
            >
              {/* Background glow */}
              <div
                className={`pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}
              />

              {/* Progress ring behind number */}
              <div className="relative inline-flex items-center justify-center w-[100px] h-[100px] mx-auto mb-2">
                <ProgressRing
                  progress={stat.progress}
                  gradientColors={stat.gradientColors}
                  inView={inView}
                  index={i}
                />
                <AnimatedStatNumber
                  value={stat.value}
                  suffix={stat.suffix}
                  gradient={stat.gradient}
                  inView={inView}
                />
              </div>

              <h3 className="mt-4 text-base sm:text-lg font-semibold text-foreground">
                {stat.label}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {stat.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
