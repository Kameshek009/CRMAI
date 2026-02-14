"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Star, ArrowRight, Sparkles, GitBranch, Users, MessageSquare } from "lucide-react";
import { ProductMockup } from "./product-mockup";

const featurePills = [
  { icon: Sparkles, label: "AI Lead Scoring" },
  { icon: GitBranch, label: "Visual Pipeline" },
  { icon: Users, label: "Smart Contacts" },
  { icon: MessageSquare, label: "AI Assistant" },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 25 } },
};

export function HeroSection() {
  return (
    <section className="relative overflow-hidden px-4 sm:px-6 pt-12 pb-16 sm:pt-20 sm:pb-24 md:pt-28 md:pb-32">
      {/* Aurora / mesh gradient background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-blue-500/[0.08] blur-[120px]" />
        <div className="absolute top-[10%] left-[15%] h-[400px] w-[400px] rounded-full bg-violet-500/[0.07] blur-[100px]" />
        <div className="absolute top-[5%] right-[10%] h-[350px] w-[350px] rounded-full bg-purple-500/[0.06] blur-[100px]" />
        <div className="absolute bottom-[10%] left-1/2 -translate-x-1/3 h-[300px] w-[500px] rounded-full bg-blue-400/[0.05] blur-[80px]" />
      </div>

      {/* Dot grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="mx-auto max-w-4xl">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="flex flex-col items-center text-center gap-6"
        >
          {/* Badge */}
          <motion.div variants={item}>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-4 py-1.5 text-xs font-semibold tracking-wide text-muted-foreground backdrop-blur-md shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              AI-Powered CRM
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={item}
            className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-foreground leading-[1.08]"
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
            className="text-base sm:text-lg text-muted-foreground max-w-2xl leading-relaxed"
          >
            Close more deals, nurture relationships, and scale your revenue —
            all from one beautifully simple platform powered by AI.
          </motion.p>

          {/* Feature pills */}
          <motion.div variants={item} className="flex flex-wrap justify-center gap-2 sm:gap-3">
            {featurePills.map((pill) => {
              const Icon = pill.icon;
              return (
                <span
                  key={pill.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1.5 text-xs font-medium text-foreground backdrop-blur-sm shadow-sm"
                >
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  {pill.label}
                </span>
              );
            })}
          </motion.div>

          {/* CTA */}
          <motion.div variants={item} className="flex flex-col sm:flex-row items-center gap-3 mt-2">
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 h-12 px-8 rounded-xl text-sm font-semibold bg-foreground text-background hover:opacity-90 transition-opacity shadow-lg"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <Link
                href="#pricing"
                className="inline-flex items-center gap-2 h-12 px-8 rounded-xl text-sm font-semibold border border-border text-foreground hover:bg-muted/50 transition-colors"
              >
                See Pricing
              </Link>
            </motion.div>
          </motion.div>

          <motion.p variants={item} className="text-xs text-muted-foreground -mt-1">
            Free Forever. No Credit Card.
          </motion.p>

          {/* Social proof */}
          <motion.div variants={item} className="flex items-center gap-2">
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

          {/* Product mockup — full width, centered */}
          <motion.div
            variants={item}
            className="w-full mt-8 sm:mt-12 flex justify-center"
          >
            <ProductMockup />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
