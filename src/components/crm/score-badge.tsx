"use client";

import { cn } from "@/lib/utils";

interface ScoreBadgeProps {
  score: number;
  label?: string;
  size?: "sm" | "md";
}

export function ScoreBadge({ score, label, size = "sm" }: ScoreBadgeProps) {
  const getColor = () => {
    if (score >= 70) return "text-emerald-600 bg-emerald-500/10";
    if (score >= 40) return "text-amber-600 bg-amber-500/10";
    return "text-red-600 bg-red-500/10";
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        getColor(),
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
      )}
    >
      {score}%{label && <span className="text-muted-foreground"> {label}</span>}
    </span>
  );
}
