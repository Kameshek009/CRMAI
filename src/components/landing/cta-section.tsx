"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

export function CTASection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 0.5], [0.9, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.3], [0, 1]);

  return (
    <section ref={ref} className="relative py-20 sm:py-32 px-4 sm:px-6 overflow-hidden">
      <motion.div style={{ scale, opacity }} className="mx-auto max-w-4xl">
        <div className="relative rounded-3xl border border-border bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-blue-500/10 p-8 sm:p-14 text-center overflow-hidden">
          <div className="pointer-events-none absolute top-[-50%] left-[-20%] h-[400px] w-[400px] rounded-full bg-violet-500/20 blur-[100px]" />
          <div className="pointer-events-none absolute bottom-[-50%] right-[-20%] h-[300px] w-[300px] rounded-full bg-blue-500/20 blur-[100px]" />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="relative"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs font-semibold text-violet-600 dark:text-violet-400 mb-6">
              <Sparkles className="w-3 h-3" />
              Start for free
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
              Ready to supercharge<br className="hidden sm:block" /> your sales?
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto mb-8">
              Join 10,000+ teams already using NexusCRM to close more deals, faster. Free forever — no credit card required.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
                <Link href="/sign-up" className="inline-flex items-center gap-2 h-13 px-10 rounded-xl text-base font-semibold bg-foreground text-background hover:opacity-90 transition-opacity shadow-lg">
                  Get Started Free
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
                <Link href="#pricing" className="inline-flex items-center gap-2 h-13 px-10 rounded-xl text-base font-semibold border border-border text-foreground hover:bg-muted/50 transition-colors">
                  View Pricing
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
