"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PrevNextNavProps {
  entityType: "contacts" | "deals" | "companies" | "leads";
  currentId: string;
}

interface NavItem {
  id: string;
  label: string;
}

export function PrevNextNav({ entityType, currentId }: PrevNextNavProps) {
  const router = useRouter();
  const [prev, setPrev] = useState<NavItem | null>(null);
  const [next, setNext] = useState<NavItem | null>(null);

  useEffect(() => {
    fetch(`/api/crm/${entityType}?limit=200&sort_by=created_at&sort_order=desc`)
      .then(r => r.json())
      .then(json => {
        if (!json.success || !json.data) return;
        const items = json.data as Record<string, unknown>[];
        const idx = items.findIndex(i => i.id === currentId);
        if (idx === -1) return;

        if (idx > 0) {
          const p = items[idx - 1];
          const label = entityType === "companies"
            ? (p.name as string)
            : `${p.first_name || ""} ${p.last_name || ""}`.trim() || (p.title as string) || "";
          setPrev({ id: p.id as string, label });
        }
        if (idx < items.length - 1) {
          const n = items[idx + 1];
          const label = entityType === "companies"
            ? (n.name as string)
            : `${n.first_name || ""} ${n.last_name || ""}`.trim() || (n.title as string) || "";
          setNext({ id: n.id as string, label });
        }
      })
      .catch(() => {});
  }, [entityType, currentId]);

  if (!prev && !next) return null;

  const basePath = `/dashboard/${entityType}`;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={!prev}
              onClick={() => prev && router.push(`${basePath}/${prev.id}`)}
            >
              <ChevronLeft className="size-4" />
            </Button>
          </TooltipTrigger>
          {prev && (
            <TooltipContent side="bottom">
              <p>{prev.label}</p>
            </TooltipContent>
          )}
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={!next}
              onClick={() => next && router.push(`${basePath}/${next.id}`)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </TooltipTrigger>
          {next && (
            <TooltipContent side="bottom">
              <p>{next.label}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
