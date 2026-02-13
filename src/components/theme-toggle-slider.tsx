"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export function ThemeToggleSlider() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="w-14 h-8 rounded-full bg-[var(--muted)] animate-pulse" aria-hidden />
    );
  }

  const isDark = resolvedTheme === "dark";

  const toggle = () => setTheme(isDark ? "light" : "dark");

  return (
    <motion.button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Включить светлую тему" : "Включить тёмную тему"}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      className="relative w-14 h-8 rounded-full border border-[var(--border)] bg-[var(--muted)]/50 transition-colors hover:bg-[var(--muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
    >
      {/* Track with two icons */}
      <span className="absolute inset-0 flex items-center justify-between px-1.5">
        <Sun className="w-4 h-4 text-[var(--muted-foreground)] shrink-0" aria-hidden />
        <Moon className="w-4 h-4 text-[var(--muted-foreground)] shrink-0" aria-hidden />
      </span>

      {/* Animated sliding thumb */}
      <motion.span
        className="absolute top-1 w-6 h-6 rounded-full bg-[var(--background)] border border-[var(--border)] shadow-sm flex items-center justify-center"
        initial={false}
        animate={{
          left: isDark ? "calc(100% - 28px)" : "4px",
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 30,
        }}
      >
        {isDark ? (
          <Moon className="w-3.5 h-3.5 text-[var(--foreground)]" aria-hidden />
        ) : (
          <Sun className="w-3.5 h-3.5 text-[var(--foreground)]" aria-hidden />
        )}
      </motion.span>
    </motion.button>
  );
}
