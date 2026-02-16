"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const companies = [
  "Salesforce",
  "HubSpot",
  "Stripe",
  "Notion",
  "Linear",
  "Vercel",
  "Figma",
  "Slack",
];

export function TrustedBySection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section ref={ref} className="relative py-16 sm:py-24 px-4 sm:px-6">
      {/* Subtle divider line */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="max-w-5xl mx-auto text-center"
      >
        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground/60">
          Trusted by industry leaders
        </span>

        <div className="mt-8 sm:mt-12 flex flex-wrap items-center justify-center gap-x-10 sm:gap-x-16 gap-y-5 sm:gap-y-6">
          {companies.map((company, i) => (
            <motion.span
              key={company}
              initial={{ opacity: 0, y: 12 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 25,
                delay: 0.1 + i * 0.05,
              }}
              whileHover={{ scale: 1.1, opacity: 1 }}
              className="text-lg sm:text-xl font-semibold text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors duration-300 select-none cursor-default"
            >
              {company}
            </motion.span>
          ))}
        </div>
      </motion.div>

      {/* Bottom divider */}
      <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </section>
  );
}
