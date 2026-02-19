"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { DealCard, type DealForCard } from "@/components/crm/deal-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Kanban, Settings2, Timer, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";

interface StageColumnProps {
  stage: {
    id: string;
    name: string;
    color: string;
    position: number;
    is_won: boolean;
    is_lost: boolean;
    rotting_days?: number | null;
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
  const { t } = useTranslation();
  const [showSettings, setShowSettings] = useState(false);
  const [rottingDays, setRottingDays] = useState(stage.rotting_days?.toString() || "");
  const [isSaving, setIsSaving] = useState(false);

  const rottingCount = deals.filter((d) => d.is_rotting).length;

  const handleSaveRotting = async () => {
    setIsSaving(true);
    try {
      const value = rottingDays.trim() === "" ? null : parseInt(rottingDays, 10);
      if (value !== null && (isNaN(value) || value < 0)) {
        toast.error(t("crm.pipeline.invalidDays"));
        return;
      }
      const res = await fetch(`/api/crm/pipeline/stages/${stage.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rotting_days: value }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(value ? t("crm.pipeline.rottingSet", { value }) : t("crm.pipeline.rottingDisabled"));
        setShowSettings(false);
      } else {
        toast.error(json.error || t("crm.pipeline.saveFailed"));
      }
    } finally {
      setIsSaving(false);
    }
  };

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
            {rottingCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold tabular-nums bg-red-500/15 text-red-600">
                {t("crm.pipeline.rotting", { count: rottingCount })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <p className={cn("text-muted-foreground font-medium", compact ? "text-[10px]" : "text-xs")}>
              ${totalValue.toLocaleString()}
            </p>
            {stage.rotting_days && !compact && (
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground/60">
                <Timer className="size-2.5" />
                {stage.rotting_days}d
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-0.5 relative z-[1]">
          {!stage.is_won && !stage.is_lost && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7 hover:bg-muted/80"
              onClick={() => setShowSettings(!showSettings)}
              aria-label={`Settings for ${stage.name}`}
            >
              <Settings2 className="size-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-7 hover:bg-muted/80"
            onClick={onAddDeal}
            aria-label={`Add deal to ${stage.name}`}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </div>

      {/* Rotting settings popover */}
      {showSettings && (
        <div className="border border-t-0 bg-card p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">{t("crm.pipeline.rottingDays")}</span>
            <Button variant="ghost" size="icon" className="size-5" onClick={() => setShowSettings(false)}>
              <X className="size-3" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              max={365}
              value={rottingDays}
              onChange={(e) => setRottingDays(e.target.value)}
              placeholder={t("crm.pipeline.rottingPlaceholder")}
              className="h-7 text-xs"
            />
            <Button size="icon" className="size-7 shrink-0" onClick={handleSaveRotting} disabled={isSaving}>
              <Check className="size-3.5" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {t("crm.pipeline.rottingHelp")}
          </p>
        </div>
      )}

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 p-2 space-y-2 min-h-[120px] sm:min-h-[200px] rounded-b-xl border border-t-0 transition-all duration-200",
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
            <p className="text-xs font-medium">{t("crm.pipeline.noDeals")}</p>
          </div>
        )}

        {isOver && (
          <div
            className="border-2 border-dashed rounded-xl h-20 flex items-center justify-center"
            style={{ borderColor: `${stage.color}60` }}
          >
            <p className="text-xs font-semibold" style={{ color: stage.color }}>{t("crm.pipeline.dropHere")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
