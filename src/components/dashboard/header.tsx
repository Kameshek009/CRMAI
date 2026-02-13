"use client";

import { useTheme } from "next-themes";
import { Button } from "@heroui/react";
import { Moon, Sun, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderProps {
  title?: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function Header({ title, description, children, className }: HeaderProps) {
  const { theme, setTheme } = useTheme();

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex items-center justify-between h-16 px-6 bg-[var(--background)]/80 backdrop-blur-sm border-b border-[var(--border)]",
        className
      )}
    >
      <div className="space-y-0.5">
        {title && <h1 className="text-xl font-semibold">{title}</h1>}
        {description && (
          <p className="text-sm text-[var(--muted-foreground)]">{description}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {children}

        {/* Notifications */}
        <Button
          isIconOnly
          variant="light"
          aria-label="Notifications"
          className="text-[var(--muted-foreground)]"
        >
          <Bell className="w-5 h-5" />
        </Button>

        {/* Theme Toggle */}
        <Button
          isIconOnly
          variant="light"
          aria-label="Toggle theme"
          className="text-[var(--muted-foreground)]"
          onPress={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </Button>
      </div>
    </header>
  );
}
