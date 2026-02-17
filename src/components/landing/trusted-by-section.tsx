"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const companies = [
  "Salesforce", "HubSpot", "Stripe", "Notion", "Linear",
  "Vercel", "Figma", "Slack", "Shopify", "Datadog",
  "MongoDB", "Supabase",
];

function MarqueeRow({ reverse = false, speed = 30 }: { reverse?: boolean; speed?: number }) {
  const doubled = [...companies, ...companies];
  return (
    <div className="flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
      <motion.div
        className="flex items-center gap-10 sm:gap-16 whitespace-nowrap"
        animate={{ x: reverse ? ["0%", "-50%"] : ["-50%", "0%"] }}
        transition={{
          duration: speed,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        {doubled.map((company, i) => (
          <span
            key={`${company}-${i}`}
            className="text-lg sm:text-xl md:text-2xl font-semibold text-muted-foreground/20 hover:text-muted-foreground/50 transition-colors duration-500 select-none cursor-default shrink-0"
          >
            {company}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

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
        className="max-w-6xl mx-auto"
      >
        <p className="text-center text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground/60 mb-8 sm:mb-12">
          Built for teams at companies like
        </p>

        <div className="flex flex-col gap-4">
          <MarqueeRow speed={35} />
          <MarqueeRow reverse speed={40} />
        </div>
      </motion.div>

      {/* Bottom divider */}
      <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </section>
  );
}
