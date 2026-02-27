"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export function ThemeToggleSlider() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional hydration avoidance
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="h-8 w-[72px] rounded-full bg-muted animate-pulse" aria-hidden />
    );
  }

  const isDark = resolvedTheme === "dark";
  const activeIndex = isDark ? 1 : 0;

  return (
    <div
      className="relative flex h-8 w-[72px] items-center rounded-full border border-border bg-muted/50 p-0.5"
      role="radiogroup"
      aria-label="Theme"
    >
      {/* Sliding indicator */}
      <motion.div
        className="absolute top-0.5 h-7 w-8 rounded-full bg-background border border-border shadow-sm"
        initial={false}
        animate={{ left: `${activeIndex * 32 + 2}px` }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
      />

      {/* Light */}
      <button
        type="button"
        role="radio"
        aria-checked={!isDark}
        aria-label="Light theme"
        onClick={() => setTheme("light")}
        className="relative z-10 flex h-7 w-8 items-center justify-center rounded-full transition-colors"
      >
        <Sun className={`size-3.5 ${!isDark ? "text-foreground" : "text-muted-foreground"}`} />
      </button>

      {/* Dark */}
      <button
        type="button"
        role="radio"
        aria-checked={isDark}
        aria-label="Dark theme"
        onClick={() => setTheme("dark")}
        className="relative z-10 flex h-7 w-8 items-center justify-center rounded-full transition-colors"
      >
        <Moon className={`size-3.5 ${isDark ? "text-foreground" : "text-muted-foreground"}`} />
      </button>
    </div>
  );
}
