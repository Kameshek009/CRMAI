"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScoreBadge } from "./score-badge";
import { Building2, Mail, Phone } from "lucide-react";

interface ContactCardProps {
  id: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  title?: string | null;
  status: string;
  engagementScore: number;
  companyName?: string | null;
  selectable?: boolean;
  selected?: boolean;
  onSelectToggle?: (id: string) => void;
}

const statusColors: Record<string, string> = {
  lead: "bg-blue-500/10 text-blue-600",
  active: "bg-emerald-500/10 text-emerald-600",
  inactive: "bg-gray-500/10 text-gray-600",
  churned: "bg-red-500/10 text-red-600",
};

export function ContactCard({
  id,
  firstName,
  lastName,
  email,
  phone,
  title,
  status,
  engagementScore,
  companyName,
  selectable,
  selected,
  onSelectToggle,
}: ContactCardProps) {
  const name = `${firstName} ${lastName || ""}`.trim();
  const initials = `${firstName.charAt(0)}${lastName?.charAt(0) || ""}`.toUpperCase();

  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50",
        selected && "ring-2 ring-primary/50 bg-primary/5"
      )}
    >
      {selectable && (
        <Checkbox
          checked={selected}
          onCheckedChange={() => onSelectToggle?.(id)}
          className="size-5 shrink-0"
        />
      )}
      <Link
        href={`/dashboard/contacts/${id}`}
        className="flex items-center gap-4 flex-1 min-w-0"
      >
        <Avatar className="size-10">
          <AvatarFallback className="text-sm">{initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{name}</span>
            <Badge variant="outline" className={statusColors[status] || ""}>
              {status}
            </Badge>
          </div>
          {title && <p className="text-sm text-muted-foreground truncate">{title}</p>}
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            {companyName && (
              <span className="flex items-center gap-1">
                <Building2 className="size-3" />
                {companyName}
              </span>
            )}
            {email && (
              <span className="flex items-center gap-1">
                <Mail className="size-3" />
                {email}
              </span>
            )}
            {phone && (
              <span className="flex items-center gap-1">
                <Phone className="size-3" />
                {phone}
              </span>
            )}
          </div>
        </div>

        <ScoreBadge score={engagementScore} />
      </Link>
    </div>
  );
}
