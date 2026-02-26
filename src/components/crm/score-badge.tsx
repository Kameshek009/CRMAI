"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";

interface ScoreBadgeProps {
  score: number;
  label?: string;
  size?: "sm" | "md";
}

export const ScoreBadge = memo(function ScoreBadge({ score, label, size = "sm" }: ScoreBadgeProps) {
  const getColor = () => {
    if (score >= 70) return { text: "text-emerald-600", bg: "bg-emerald-500/10", stroke: "#22c55e" };
    if (score >= 40) return { text: "text-amber-600", bg: "bg-amber-500/10", stroke: "#f59e0b" };
    return { text: "text-red-600", bg: "bg-red-500/10", stroke: "#ef4444" };
  };

  const color = getColor();
  const dimensions = size === "sm" ? 36 : 44;
  const strokeWidth = size === "sm" ? 3 : 3.5;
  const radius = (dimensions - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / 100) * circumference;

  const scoreLabel = score >= 70 ? "High" : score >= 40 ? "Medium" : "Low";

  return (
    <div
      className={cn("score-ring relative", size === "sm" ? "w-9 h-9" : "w-11 h-11")}
      role="meter"
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${label || "Score"}: ${score}% (${scoreLabel})`}
    >
      <svg width={dimensions} height={dimensions} className="absolute inset-0">
        <circle
          cx={dimensions / 2}
          cy={dimensions / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/40"
        />
        <circle
          cx={dimensions / 2}
          cy={dimensions / 2}
          r={radius}
          fill="none"
          stroke={color.stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)" }}
        />
      </svg>
      <span className={cn(
        "absolute inset-0 flex items-center justify-center font-bold",
        color.text,
        size === "sm" ? "text-[10px]" : "text-xs"
      )}>
        {score}
      </span>
    </div>
  );
});
