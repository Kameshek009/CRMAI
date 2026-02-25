"use client";

import { useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { HelpCircle, ChevronDown } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

const faqKeys = ["q1", "q2", "q3", "q4", "q5", "q6", "q7"] as const;

function FAQItem({ questionKey, index }: { questionKey: string; index: number }) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{
        delay: index * 0.06,
        type: "spring",
        stiffness: 200,
        damping: 22,
      }}
      className="group"
    >
      <div className="rounded-2xl border border-white/10 dark:border-white/10 bg-white/[0.02] dark:bg-white/[0.02] backdrop-blur-xl overflow-hidden hover:border-white/20 dark:hover:border-white/20 transition-all duration-300">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="flex items-center justify-between w-full text-left px-6 py-5 sm:px-8 sm:py-6"
        >
          <span className="text-sm sm:text-base font-semibold text-foreground pr-4">
            {t(`landing.faq.items.${questionKey}.question`)}
          </span>
          <motion.div
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="shrink-0"
          >
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          </motion.div>
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="overflow-hidden"
            >
              <div className="px-6 pb-5 sm:px-8 sm:pb-6 pt-0">
                <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-4" />
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {t(`landing.faq.items.${questionKey}.answer`)}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export function FAQSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const { t } = useTranslation();

  return (
    <section
      id="faq"
      ref={ref}
      className="relative py-24 sm:py-36 px-4 sm:px-6 overflow-hidden"
    >
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute top-[20%] left-1/2 -translate-x-1/2 h-[500px] w-[700px] rounded-full"
          style={{
            background: "radial-gradient(ellipse, rgba(var(--landing-accent-rgb),0.05) 0%, rgba(var(--landing-accent-rgb),0.02) 40%, transparent 70%)",
            filter: "blur(100px)",
          }}
        />
      </div>

      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className="text-center mb-12 sm:mb-16"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 dark:border-white/10 bg-white/5 dark:bg-white/5 px-5 py-2 text-xs font-semibold tracking-wide text-muted-foreground backdrop-blur-xl mb-6">
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            {t("landing.faq.badge")}
          </span>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tighter text-foreground">
            {t("landing.faq.title")}
            <br />
            <span className="landing-gradient-text bg-gradient-to-r from-landing-accent via-landing-accent to-landing-accent bg-clip-text text-transparent">
              {t("landing.faq.titleHighlight")}
            </span>
          </h2>
        </motion.div>

        {/* FAQ Items */}
        <div className="flex flex-col gap-3 sm:gap-4">
          {faqKeys.map((key, i) => (
            <FAQItem key={key} questionKey={key} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
