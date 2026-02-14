"use client";

import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScoreBadge } from "./score-badge";
import { Globe, Users } from "lucide-react";

interface CompanyCardProps {
  id: string;
  name: string;
  industry?: string | null;
  size?: string | null;
  domain?: string | null;
  aiHealthScore: number;
  contactCount?: number;
}

export function CompanyCard({
  id,
  name,
  industry,
  size,
  domain,
  aiHealthScore,
  contactCount,
}: CompanyCardProps) {
  const initials = name.slice(0, 2).toUpperCase();

  return (
    <Link
      href={`/dashboard/companies/${id}`}
      className="flex flex-col gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50"
    >
      <div className="flex items-center gap-3">
        <Avatar className="size-10">
          <AvatarFallback className="text-sm bg-primary/10 text-primary">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{name}</p>
          {industry && <p className="text-sm text-muted-foreground">{industry}</p>}
        </div>
        <ScoreBadge score={aiHealthScore} />
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {size && <span>{size} employees</span>}
        {domain && (
          <span className="flex items-center gap-1">
            <Globe className="size-3" />
            {domain}
          </span>
        )}
        {typeof contactCount === "number" && (
          <span className="flex items-center gap-1">
            <Users className="size-3" />
            {contactCount} contact{contactCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    </Link>
  );
}
