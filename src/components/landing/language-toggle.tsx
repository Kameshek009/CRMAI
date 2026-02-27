"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

export function LanguageToggle() {
  const { locale, setLocale } = useTranslation();
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional hydration avoidance
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="h-8 w-[72px] rounded-full bg-muted animate-pulse" aria-hidden />
    );
  }

  const activeIndex = locale === "ru" ? 1 : 0;

  return (
    <div
      className="relative flex h-8 w-[72px] items-center rounded-full border border-border bg-muted/50 p-0.5"
      role="radiogroup"
      aria-label="Language"
    >
      <motion.div
        className="absolute top-0.5 h-7 w-8 rounded-full bg-background border border-border shadow-sm"
        initial={false}
        animate={{ left: `${activeIndex * 32 + 2}px` }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
      />

      <button
        type="button"
        role="radio"
        aria-checked={locale === "en"}
        aria-label="English"
        onClick={() => setLocale("en" as Locale)}
        className="relative z-10 flex h-7 w-8 items-center justify-center rounded-full transition-colors"
      >
        <span className={`text-xs font-semibold ${locale === "en" ? "text-foreground" : "text-muted-foreground"}`}>
          EN
        </span>
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={locale === "ru"}
        aria-label="Русский"
        onClick={() => setLocale("ru" as Locale)}
        className="relative z-10 flex h-7 w-8 items-center justify-center rounded-full transition-colors"
      >
        <span className={`text-xs font-semibold ${locale === "ru" ? "text-foreground" : "text-muted-foreground"}`}>
          RU
        </span>
      </button>
    </div>
  );
}
