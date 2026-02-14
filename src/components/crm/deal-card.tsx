"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Building2, User, GripVertical, Calendar } from "lucide-react";
import Link from "next/link";

export interface DealForCard {
  id: string;
  title: string;
  value: number;
  ai_win_probability: number;
  expected_close_date: string | null;
  contacts: { id: string; first_name: string; last_name: string | null } | null;
  companies: { id: string; name: string } | null;
}

interface DealCardProps {
  deal: DealForCard;
  isOverlay?: boolean;
}

export function DealCard({ deal, isOverlay = false }: DealCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
    disabled: isOverlay,
  });

  const style = transform
    ? { transform: CSS.Transform.toString(transform), opacity: isDragging ? 0.3 : 1 }
    : undefined;

  const contactName = deal.contacts
    ? `${deal.contacts.first_name} ${deal.contacts.last_name || ""}`.trim()
    : null;

  const prob = deal.ai_win_probability ?? 0;
  const probColor = prob >= 70 ? "text-emerald-600 border-emerald-200" : prob >= 40 ? "text-amber-600 border-amber-200" : "text-red-600 border-red-200";
  const probLabel = prob >= 70 ? "Hot" : prob >= 40 ? "Warm" : "At Risk";

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        className={cn(
          "p-3 transition-all group",
          isDragging && "shadow-lg ring-2 ring-primary/20",
          isOverlay && "shadow-xl ring-2 ring-primary/30 rotate-2",
          !isDragging && !isOverlay && "hover:shadow-md"
        )}
      >
        <div className="flex items-start gap-2">
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          >
            <GripVertical className="size-4" />
          </button>

          <div className="flex-1 min-w-0">
            <Link
              href={`/dashboard/deals/${deal.id}`}
              className="font-medium text-sm hover:underline truncate block"
            >
              {deal.title}
            </Link>
            <p className="text-base font-semibold mt-0.5">
              ${Number(deal.value).toLocaleString()}
            </p>

            {(contactName || deal.companies?.name) && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                {deal.companies?.name && (
                  <span className="flex items-center gap-1 truncate max-w-[120px]">
                    <Building2 className="size-3 shrink-0" />
                    {deal.companies.name}
                  </span>
                )}
                {contactName && (
                  <span className="flex items-center gap-1 truncate max-w-[120px]">
                    <User className="size-3 shrink-0" />
                    {contactName}
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center justify-between mt-2">
              <Badge variant="outline" className={cn("text-[10px] px-1.5", probColor)}>
                {probLabel} {prob}%
              </Badge>
              {deal.expected_close_date && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Calendar className="size-2.5" />
                  {new Date(deal.expected_close_date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
