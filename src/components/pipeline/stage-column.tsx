"use client";

import { useState, useRef, useEffect } from "react";
import { useDroppable } from "@dnd-kit/core";
import { DealCard, type DealForCard } from "@/components/crm/deal-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Settings2, Timer, X, Check, Trophy, XCircle } from "lucide-react";
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
  isLast: boolean;
  onAddDeal: () => void;
  onQuickAdd: (stageId: string, title: string) => Promise<void>;
}

export function StageColumn({
  stage,
  deals,
  totalValue,
  count,
  isOver,
  isLast,
  onAddDeal,
  onQuickAdd,
}: StageColumnProps) {
  const { setNodeRef } = useDroppable({ id: stage.id });
  const { t } = useTranslation();
  const [showSettings, setShowSettings] = useState(false);
  const [rottingDays, setRottingDays] = useState(stage.rotting_days?.toString() || "");
  const [isSaving, setIsSaving] = useState(false);
  const [quickAddValue, setQuickAddValue] = useState("");
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const quickAddRef = useRef<HTMLInputElement>(null);

  const rottingCount = deals.filter((d) => d.is_rotting).length;

  useEffect(() => {
    if (showQuickAdd && quickAddRef.current) {
      quickAddRef.current.focus();
    }
  }, [showQuickAdd]);

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

  const handleQuickAdd = async () => {
    const title = quickAddValue.trim();
    if (!title || isAdding) return;
    setIsAdding(true);
    try {
      await onQuickAdd(stage.id, title);
      setQuickAddValue("");
    } finally {
      setIsAdding(false);
    }
  };

  const stageIcon = stage.is_won ? (
    <Trophy className="size-3.5 text-emerald-500" />
  ) : stage.is_lost ? (
    <XCircle className="size-3.5 text-red-500" />
  ) : null;

  return (
    <div
      className={cn(
        "flex-1 min-w-[260px] max-w-[380px] flex flex-col h-full min-h-0",
        !isLast && "border-r border-border/40"
      )}
    >
      {/* Header */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        {/* Color bar */}
        <div
          className="h-1 w-full rounded-full mb-3"
          style={{ backgroundColor: stage.color || "#6b7280" }}
        />
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {stageIcon}
              <h3 className="font-semibold text-sm truncate">{stage.name}</h3>
              <span
                className="text-[11px] px-1.5 py-0.5 rounded-md font-medium tabular-nums shrink-0"
                style={{ backgroundColor: `${stage.color}15`, color: stage.color }}
              >
                {count}
              </span>
              {rottingCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium tabular-nums bg-red-500/10 text-red-500 shrink-0">
                  {t("crm.pipeline.rotting", { count: rottingCount })}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-muted-foreground font-medium tabular-nums">
                ${totalValue.toLocaleString()}
              </p>
              {stage.rotting_days && (
                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground/50">
                  <Timer className="size-2.5" />
                  {stage.rotting_days}d
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {!stage.is_won && !stage.is_lost && (
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-foreground"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings2 className="size-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-foreground"
              onClick={() => setShowQuickAdd(true)}
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Rotting settings */}
      {showSettings && (
        <div className="mx-3 mb-2 p-2.5 rounded-lg bg-muted/50 space-y-2">
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

      {/* Drop zone — scrollable card list */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 px-2 pb-2 space-y-2 min-h-0 overflow-y-auto transition-colors duration-200",
          isOver && "bg-primary/5"
        )}
      >
        {deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} />
        ))}

        {deals.length === 0 && !isOver && !showQuickAdd && (
          <button
            onClick={() => setShowQuickAdd(true)}
            className="w-full py-8 flex flex-col items-center justify-center text-muted-foreground/40 hover:text-muted-foreground/60 hover:bg-muted/30 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="size-5 mb-1" />
            <p className="text-xs font-medium">{t("crm.pipeline.noDeals")}</p>
          </button>
        )}

        {isOver && (
          <div
            className="border-2 border-dashed rounded-lg h-16 flex items-center justify-center transition-colors"
            style={{ borderColor: `${stage.color}50` }}
          >
            <p className="text-xs font-medium" style={{ color: stage.color }}>{t("crm.pipeline.dropHere")}</p>
          </div>
        )}
      </div>

      {/* Inline quick-add */}
      {showQuickAdd && (
        <div className="px-2 pb-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <Input
              ref={quickAddRef}
              value={quickAddValue}
              onChange={(e) => setQuickAddValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleQuickAdd();
                if (e.key === "Escape") {
                  setShowQuickAdd(false);
                  setQuickAddValue("");
                }
              }}
              placeholder={t("crm.pipeline.quickAddPlaceholder")}
              className="h-8 text-sm"
              disabled={isAdding}
            />
            <Button
              size="icon"
              variant="ghost"
              className="size-8 shrink-0 text-muted-foreground"
              onClick={() => {
                setShowQuickAdd(false);
                setQuickAddValue("");
              }}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
