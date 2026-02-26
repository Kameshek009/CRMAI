"use client";

import { memo, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";

function useAnimatedNumber(target: number, duration = 1200): number {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef<number>(undefined);

  useEffect(() => {
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(target * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return current;
}

interface StatWidgetProps {
  href: string;
  label: string;
  value: number;
  formattedValue?: string;
  subtitle: string;
  icon: LucideIcon;
  trend?: { direction: "up" | "down"; text: string };
}

export const StatWidget = memo(function StatWidget({ href, label, value, formattedValue, subtitle, icon: Icon, trend }: StatWidgetProps) {
  const animatedValue = useAnimatedNumber(value);

  return (
    <Link href={href}>
      <Card className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
            <Icon className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
        <div className="text-2xl font-bold tracking-tight">
          {formattedValue
            ? formattedValue.replace(/[\d,]+/, animatedValue.toLocaleString())
            : animatedValue.toLocaleString()}
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-muted-foreground">{subtitle}</p>
          {trend && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium",
              trend.direction === "up" ? "text-emerald-500" : "text-red-500"
            )}>
              {trend.direction === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {trend.text}
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
});
