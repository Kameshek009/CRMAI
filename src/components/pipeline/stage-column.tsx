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
        className="flex items-center justify-between p-3 rounded-t-xl bg-card border border-b-0 relative overflow-hidden"
        style={{ borderTopColor: stage.color || "#6b7280", borderTopWidth: 3 }}
      >
        {/* Subtle color wash */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{ background: `linear-gradient(135deg, ${stage.color}, transparent)` }}
        />
        <div className="relative z-[1]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color, boxShadow: `0 0 8px ${stage.color}50` }} />
            <h3 className={cn("font-bold", compact ? "text-xs" : "text-sm")}>{stage.name}</h3>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold tabular-nums"
              style={{ backgroundColor: `${stage.color}15`, color: stage.color }}
            >
              {count}
            </span>
          </div>
          <p className={cn("text-muted-foreground mt-0.5 font-medium", compact ? "text-[10px]" : "text-xs")}>
            ${totalValue.toLocaleString()}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 relative z-[1] hover:bg-muted/80"
          onClick={onAddDeal}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 p-2 space-y-2 min-h-[200px] rounded-b-xl border border-t-0 transition-all duration-200",
          isOver
            ? "bg-primary/5 border-primary/40 ring-2 ring-primary/20 shadow-inner"
            : "bg-muted/10 dark:bg-muted/5"
        )}
      >
        {deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} />
        ))}

        {deals.length === 0 && !isOver && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/50">
            <Kanban className="size-6 mb-1.5" />
            <p className="text-xs font-medium">No deals</p>
          </div>
        )}

        {isOver && (
          <div
            className="border-2 border-dashed rounded-xl h-20 flex items-center justify-center"
            style={{ borderColor: `${stage.color}60` }}
          >
            <p className="text-xs font-semibold" style={{ color: stage.color }}>Drop here</p>
          </div>
        )}
      </div>
    </div>
  );
}
