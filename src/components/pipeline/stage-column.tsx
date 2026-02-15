"use client";

import { useDroppable } from "@dnd-kit/core";
import { DealCard, type DealForCard } from "@/components/crm/deal-card";
import { Button } from "@/components/ui/button";
import { Plus, Kanban } from "lucide-react";
import { cn } from "@/lib/utils";

interface StageColumnProps {
  stage: {
    id: string;
    name: string;
    color: string;
    position: number;
    is_won: boolean;
    is_lost: boolean;
  };
  deals: DealForCard[];
  totalValue: number;
  count: number;
  isOver: boolean;
  onAddDeal: () => void;
  compact?: boolean;
}

export function StageColumn({
  stage,
  deals,
  totalValue,
  count,
  isOver,
  onAddDeal,
  compact = false,
}: StageColumnProps) {
  const { setNodeRef } = useDroppable({ id: stage.id });

  return (
    <div className={cn("shrink-0 flex flex-col", compact ? "w-56" : "w-72")}>
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 rounded-t-xl bg-card border border-b-0"
        style={{ borderTopColor: stage.color || "#6b7280", borderTopWidth: 3 }}
      >
        <div>
          <div className="flex items-center gap-2">
            <h3 className={cn("font-semibold", compact ? "text-xs" : "text-sm")}>{stage.name}</h3>
            <span className="text-[11px] bg-muted px-1.5 py-0.5 rounded-full font-medium tabular-nums">
              {count}
            </span>
          </div>
          <p className={cn("text-muted-foreground mt-0.5", compact ? "text-[10px]" : "text-xs")}>
            ${totalValue.toLocaleString()}
          </p>
        </div>
        <Button variant="ghost" size="icon" className="size-7" onClick={onAddDeal}>
          <Plus className="size-4" />
        </Button>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 p-2 space-y-2 min-h-[200px] rounded-b-xl border border-t-0 transition-colors duration-200",
          isOver
            ? "bg-primary/5 border-primary/40 ring-2 ring-primary/20"
            : "bg-muted/20"
        )}
      >
        {deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} />
        ))}

        {deals.length === 0 && !isOver && (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <Kanban className="size-5 mb-1 opacity-40" />
            <p className="text-xs">No deals</p>
          </div>
        )}

        {isOver && (
          <div className="border-2 border-dashed border-primary/40 rounded-lg h-16 flex items-center justify-center animate-pulse">
            <p className="text-xs text-primary/60 font-medium">Drop here</p>
          </div>
        )}
      </div>
    </div>
  );
}
