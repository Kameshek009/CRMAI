"use client";

import { cn, formatNumber, formatCompact, calculatePercentage } from "@/lib/utils";

interface UsageProgressProps {
  used: number;
  limit: number;
  label?: string;
  showValues?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function UsageProgress({
  used,
  limit,
  label = "Usage",
  showValues = true,
  size = "md",
  className,
}: UsageProgressProps) {
  const percentage = calculatePercentage(used, limit);

  const sizeClasses = {
    sm: "h-1",
    md: "h-2",
    lg: "h-3",
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        {showValues && (
          <span className="text-sm text-muted-foreground">
            {formatCompact(used)} / {formatCompact(limit)}
          </span>
        )}
      </div>
      <div
        className={cn("w-full rounded-full bg-primary/20 overflow-hidden", sizeClasses[size])}
        role="progressbar"
        aria-label={`${label}: ${percentage}%`}
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{percentage}% used</span>
        <span>{formatNumber(limit - used)} remaining</span>
      </div>
    </div>
  );
}

interface UsageCircleProps {
  used: number;
  limit: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function UsageCircle({
  used,
  limit,
  size = 120,
  strokeWidth = 8,
  className,
}: UsageCircleProps) {
  const percentage = calculatePercentage(used, limit);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const getColor = () => {
    return "var(--foreground)";
  };

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--secondary)"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold">{percentage}%</span>
        <span className="text-xs text-muted-foreground">used</span>
      </div>
    </div>
  );
}
