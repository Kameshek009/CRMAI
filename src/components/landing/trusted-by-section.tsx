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
];

export function TrustedBySection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section ref={ref} className="py-20 px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="max-w-5xl mx-auto text-center"
      >
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Trusted by the best
        </span>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
          {companies.map((company, i) => (
            <motion.span
              key={company}
              initial={{ opacity: 0, y: 12 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 25,
                delay: 0.1 + i * 0.06,
              }}
              className="text-lg font-semibold text-muted-foreground/50 select-none"
            >
              {company}
            </motion.span>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
