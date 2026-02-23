"use client";

import { useState } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Building2, Mail, Phone, Briefcase } from "lucide-react";

interface EntityPreview {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  title?: string | null;
  company?: string | null;
  status?: string | null;
}

interface EntityHoverCardProps {
  entityType: "contact" | "company";
  entityId: string;
  children: React.ReactNode;
}

export function EntityHoverCard({ entityType, entityId, children }: EntityHoverCardProps) {
  const [data, setData] = useState<EntityPreview | null>(null);
  const [loaded, setLoaded] = useState(false);

  const handleOpen = (open: boolean) => {
    if (open && !loaded) {
      const endpoint = entityType === "contact"
        ? `/api/crm/contacts/${entityId}`
        : `/api/crm/companies/${entityId}`;

      fetch(endpoint)
        .then(r => r.json())
        .then(json => {
          if (json.success) {
            const d = json.data;
            if (entityType === "contact") {
              setData({
                id: d.id,
                name: `${d.first_name} ${d.last_name || ""}`.trim(),
                email: d.email,
                phone: d.phone,
                title: d.title,
                company: d.companies?.name,
                status: d.status,
              });
            } else {
              setData({
                id: d.id,
                name: d.name,
                email: d.email,
                phone: d.phone,
                title: d.industry,
                status: d.size,
              });
            }
          }
          setLoaded(true);
        })
        .catch(() => setLoaded(true));
    }
  };

  const initials = data?.name
    ? data.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "??";

  return (
    <HoverCard openDelay={300} closeDelay={100} onOpenChange={handleOpen}>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent className="w-72" side="top">
        {!data ? (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3 w-24 bg-muted animate-pulse rounded" />
              <div className="h-2.5 w-32 bg-muted animate-pulse rounded" />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {entityType === "contact" ? (
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs bg-primary/10">{initials}</AvatarFallback>
                </Avatar>
              ) : (
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{data.name}</p>
                {data.company && (
                  <p className="text-xs text-muted-foreground truncate">{data.company}</p>
                )}
              </div>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              {data.title && (
                <div className="flex items-center gap-1.5">
                  <Briefcase className="size-3" />
                  <span className="truncate">{data.title}</span>
                </div>
              )}
              {data.email && (
                <div className="flex items-center gap-1.5">
                  <Mail className="size-3" />
                  <span className="truncate">{data.email}</span>
                </div>
              )}
              {data.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="size-3" />
                  <span>{data.phone}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
