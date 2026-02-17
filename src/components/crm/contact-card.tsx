"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScoreBadge } from "./score-badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
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

const statusConfig: Record<string, { color: string; dot: string }> = {
  lead: { color: "bg-landing-accent/10 text-orange-600 border-landing-accent/20", dot: "bg-landing-accent" },
  active: { color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", dot: "bg-emerald-500" },
  inactive: { color: "bg-gray-500/10 text-gray-500 border-gray-500/20", dot: "bg-gray-400" },
  churned: { color: "bg-red-500/10 text-red-600 border-red-500/20", dot: "bg-red-500" },
};

const avatarGradients: Record<string, string> = {
  lead: "from-landing-accent/20 to-orange-500/20",
  active: "from-emerald-500/20 to-teal-500/20",
  inactive: "from-gray-400/20 to-gray-500/20",
  churned: "from-red-500/20 to-orange-500/20",
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
  const config = statusConfig[status] || statusConfig.lead;
  const gradient = avatarGradients[status] || avatarGradients.lead;

  return (
    <div
      className={cn(
        "premium-card card-shine flex items-center gap-4 rounded-xl border p-4 bg-card",
        selected && "ring-2 ring-primary/40 bg-primary/5 shadow-md"
      )}
    >
      {selectable && (
        <Checkbox
          checked={selected}
          onCheckedChange={() => onSelectToggle?.(id)}
          className="size-5 shrink-0 premium-checkbox"
          aria-label={`Select ${name}`}
        />
      )}
      <Link
        href={`/dashboard/contacts/${id}`}
        className="flex items-center gap-4 flex-1 min-w-0 relative z-[1]"
      >
        <div className="relative">
          <Avatar className={cn("size-11 ring-2 ring-offset-2 ring-offset-background transition-all", selected ? "ring-primary/30" : "ring-transparent")}>
            <AvatarFallback className={cn("text-sm font-semibold bg-gradient-to-br", gradient)}>
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className={cn("absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background", config.dot)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold truncate text-sm">{name}</span>
            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border badge-shimmer", config.color)}>
              {status}
            </Badge>
          </div>
          {title && <p className="text-xs text-muted-foreground truncate mt-0.5">{title}</p>}
          <TooltipProvider delayDuration={300}>
            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
              {companyName && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-1 hover:text-foreground transition-colors">
                      <Building2 className="size-3 shrink-0" />
                      <span className="truncate max-w-[120px]">{companyName}</span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">{companyName}</TooltipContent>
                </Tooltip>
              )}
              {email && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-1 hover:text-foreground transition-colors">
                      <Mail className="size-3 shrink-0" />
                      <span className="truncate max-w-[140px]">{email}</span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">{email}</TooltipContent>
                </Tooltip>
              )}
              {phone && (
                <span className="flex items-center gap-1 hover:text-foreground transition-colors hidden sm:flex">
                  <Phone className="size-3 shrink-0" />
                  {phone}
                </span>
              )}
            </div>
          </TooltipProvider>
        </div>

        <ScoreBadge score={engagementScore} />
      </Link>
    </div>
  );
}
