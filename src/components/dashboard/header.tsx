"use client";

import { useTheme } from "next-themes";
import { Moon, Sun, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface HeaderProps {
  title?: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function Header({ title, description, children, className }: HeaderProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const cycleTheme = () => {
    if (theme === "system") setTheme("light");
    else if (theme === "light") setTheme("dark");
    else setTheme("system");
  };

  const ThemeIcon = !mounted
    ? Sun
    : theme === "system"
      ? Monitor
      : resolvedTheme === "dark"
        ? Moon
        : Sun;

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex items-center justify-between h-16 px-6 header-shimmer",
        "bg-background/70 backdrop-blur-xl border-b border-border/50",
        "dark:bg-background/60",
        className
      )}
    >
      <div className="space-y-0.5">
        {title && <h1 className="text-xl font-bold tracking-tight">{title}</h1>}
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {children}

        {/* Theme Toggle */}
        <button
          onClick={cycleTheme}
          aria-label="Toggle theme"
          className={cn(
            "flex size-9 items-center justify-center rounded-xl",
            "text-muted-foreground hover:text-foreground",
            "hover:bg-secondary/80 active:scale-95",
            "transition-all duration-200"
          )}
        >
          <ThemeIcon className="size-[18px]" />
        </button>
      </div>
    </header>
  );
}
