"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Star, ArrowRight } from "lucide-react";
import { ProductMockup } from "./product-mockup";

const features = [
  "AI-powered lead scoring & deal insights",
  "Visual drag & drop sales pipeline",
  "Smart contact management with engagement tracking",
  "Natural language CRM commands via AI assistant",
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.15 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 25 } },
};

export function HeroSection() {
  return (
    <section className="relative overflow-hidden px-4 sm:px-6 pt-8 pb-12 sm:pt-12 sm:pb-16 md:pt-24 md:pb-28">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left column */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="flex flex-col gap-6"
          >
            {/* Badge */}
            <motion.div variants={item}>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-4 py-1.5 text-xs font-semibold tracking-wide text-muted-foreground backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                AI-Powered CRM
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={item}
              className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground leading-[1.1]"
            >
              The Best{" "}
              <span className="bg-gradient-to-r from-blue-600 via-violet-500 to-purple-600 bg-clip-text text-transparent">
                AI-Powered CRM
              </span>{" "}
              for Growing Teams
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              variants={item}
              className="text-base sm:text-lg text-muted-foreground max-w-lg leading-relaxed"
            >
              Close more deals, nurture relationships, and scale your revenue —
              all from one beautifully simple platform powered by AI.
            </motion.p>

            {/* Feature bullets */}
            <motion.ul variants={container} className="flex flex-col gap-2 sm:gap-3 mt-1">
              {features.map((feat) => (
                <motion.li
                  key={feat}
                  variants={item}
                  className="flex items-center gap-3 text-sm text-foreground"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  {feat}
                </motion.li>
              ))}
            </motion.ul>

            {/* CTA */}
            <motion.div variants={item} className="flex flex-col gap-2 sm:gap-3 mt-2">
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <Link
                  href="/sign-up"
                  className="inline-flex items-center gap-2 h-11 sm:h-12 px-6 sm:px-8 rounded-xl text-sm font-semibold bg-foreground text-background hover:opacity-90 transition-opacity shadow-lg"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
              <span className="text-xs text-muted-foreground">
                Free Forever. No Credit Card.
              </span>
            </motion.div>

            {/* Rating */}
            <motion.div variants={item} className="flex items-center gap-2 mt-1">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 fill-amber-400 text-amber-400"
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">
                4.9/5 from 2,400+ reviews
              </span>
            </motion.div>
          </motion.div>

          {/* Right column — mockup */}
          <div className="hidden sm:flex justify-center lg:justify-end">
            <ProductMockup />
          </div>
        </div>
      </div>

      {/* Background gradient orbs */}
      <div className="pointer-events-none absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-blue-500/[0.07] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-[400px] w-[400px] rounded-full bg-purple-500/[0.07] blur-3xl" />
    </section>
  );
}
