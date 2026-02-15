"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";

interface Stat {
  value: number;
  suffix: string;
  label: string;
  description: string;
}

const stats: Stat[] = [
  { value: 3, suffix: "x", label: "More Deals Closed", description: "Teams using NexusCRM close 3x more deals on average" },
  { value: 85, suffix: "%", label: "Less Manual Work", description: "AI automations eliminate repetitive data entry and follow-ups" },
  { value: 40, suffix: "%", label: "Faster Sales Cycle", description: "Shorten your pipeline with AI-powered insights and scoring" },
  { value: 10, suffix: "K+", label: "Teams Trust Us", description: "Growing businesses worldwide choose NexusCRM" },
];

function AnimatedCounter({ value, suffix, inView }: { value: number; suffix: string; inView: boolean }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 2000;
    const step = Math.max(1, Math.floor(value / 60));
    const interval = duration / (value / step);

    const timer = setInterval(() => {
      start += step;
      if (start >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [inView, value]);

  return (
    <span className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
      {count}{suffix}
    </span>
  );
}

export function StatsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="stats" ref={ref} className="relative py-20 sm:py-32 px-4 sm:px-6 overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.02]"
        style={{ backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "32px 32px" }}
      />
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className="text-center mb-14 sm:mb-20"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            The numbers speak{" "}
            <span className="bg-gradient-to-r from-emerald-500 to-cyan-500 bg-clip-text text-transparent">for themselves</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.12, type: "spring", stiffness: 150, damping: 20 }}
              className="text-center p-6 rounded-2xl border border-border bg-card hover:shadow-lg transition-shadow"
            >
              <AnimatedCounter value={stat.value} suffix={stat.suffix} inView={inView} />
              <h3 className="mt-3 text-base font-semibold text-foreground">{stat.label}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{stat.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
