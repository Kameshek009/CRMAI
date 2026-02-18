"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScoreBadge } from "./score-badge";
import { Globe, Users, Factory } from "lucide-react";

interface CompanyCardProps {
  id: string;
  name: string;
  industry?: string | null;
  size?: string | null;
  domain?: string | null;
  aiHealthScore: number;
  contactCount?: number;
  selectable?: boolean;
  selected?: boolean;
  onSelectToggle?: (id: string) => void;
}

const healthGradients: Record<string, string> = {
  excellent: "from-emerald-500/20 to-teal-500/20",
  good: "from-blue-500/20 to-cyan-500/20",
  fair: "from-amber-500/20 to-yellow-500/20",
  poor: "from-red-500/20 to-orange-500/20",
};

function getHealthLevel(score: number): string {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "fair";
  return "poor";
}

export function CompanyCard({
  id,
  name,
  industry,
  size,
  domain,
  aiHealthScore,
  contactCount,
  selectable,
  selected,
  onSelectToggle,
}: CompanyCardProps) {
  const initials = name.slice(0, 2).toUpperCase();
  const healthLevel = getHealthLevel(aiHealthScore);
  const gradient = healthGradients[healthLevel] || healthGradients.good;

  return (
    <div
      className={cn(
        "premium-card card-shine flex flex-col gap-4 rounded-xl border p-4 bg-card",
        selected && "ring-2 ring-primary/40 bg-primary/5 shadow-md"
      )}
    >
      <div className="flex items-center gap-4">
        {selectable && (
          <Checkbox
            checked={selected}
            onCheckedChange={() => onSelectToggle?.(id)}
            className="size-5 shrink-0 premium-checkbox"
            aria-label={`Select ${name}`}
          />
        )}
        <Link
          href={`/dashboard/companies/${id}`}
          className="flex items-center gap-4 flex-1 min-w-0 relative z-[1]"
        >
          <Avatar className="size-11">
            <AvatarFallback className={cn("text-sm font-bold bg-gradient-to-br", gradient)}>
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate text-sm">{name}</p>
            {industry && (
              <div className="flex items-center gap-1 mt-1">
                <Factory className="size-3 text-muted-foreground" />
                <p className="text-xs text-muted-foreground truncate">{industry}</p>
              </div>
            )}
          </div>
          <ScoreBadge score={aiHealthScore} />
        </Link>
      </div>

      <div className="flex items-center gap-4 text-[11px] text-muted-foreground pl-1 relative z-[1]">
        {size && (
          <Badge variant="outline" className="text-[10px] py-0 px-2 font-normal">
            {size} emp.
          </Badge>
        )}
        {domain && (
          <span className="flex items-center gap-1 hover:text-foreground transition-colors truncate">
            <Globe className="size-3 shrink-0" />
            {domain}
          </span>
        )}
        {typeof contactCount === "number" && (
          <span className="flex items-center gap-1 hover:text-foreground transition-colors">
            <Users className="size-3 shrink-0" />
            {contactCount}
          </span>
        )}
      </div>
    </div>
  );
}
