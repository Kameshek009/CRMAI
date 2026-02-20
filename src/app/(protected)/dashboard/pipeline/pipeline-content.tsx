"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "@/lib/i18n";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  rectIntersection,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { DealCardOverlay, type DealForCard } from "@/components/crm/deal-card";
import { EntityForm, type FormField } from "@/components/crm/entity-form";
import { EmptyState } from "@/components/crm/empty-state";
import { PipelineToolbar } from "@/components/pipeline/pipeline-toolbar";
import { StageColumn } from "@/components/pipeline/stage-column";
import { Skeleton } from "@/components/ui/skeleton";
import { Kanban } from "lucide-react";
import { toast } from "sonner";

// ── Types ───────────────────────────────────────────────────────────────

interface PipelineStage {
  id: string;
  name: string;
  color: string;
  position: number;
  is_won: boolean;
  is_lost: boolean;
  rotting_days?: number | null;
}

interface PipelineColumn {
  stage: PipelineStage;
  deals: DealForCard[];
  totalValue: number;
  count: number;
}

// ── Pipeline Page ───────────────────────────────────────────────────────

export function PipelineContent() {
  const { t } = useTranslation();

  const dealFields: FormField[] = useMemo(() => [
    { name: "title", label: t("crm.pipeline.dealTitle"), type: "text" as const, required: true, placeholder: t("crm.pipeline.newDealPlaceholder") },
    { name: "value", label: t("crm.pipeline.value"), type: "number" as const, placeholder: "10000" },
    { name: "expected_close_date", label: t("crm.pipeline.expectedClose"), type: "date" as const },
    { name: "description", label: t("crm.pipeline.description"), type: "textarea" as const },
  ], [t]);
  const [columns, setColumns] = useState<PipelineColumn[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [weightedForecast, setWeightedForecast] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  // DnD state
  const [activeDeal, setActiveDeal] = useState<DealForCard | null>(null);
  const [activeOverStageId, setActiveOverStageId] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [newDealStageId, setNewDealStageId] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    })
  );

  const fetchPipeline = useCallback(async () => {
    try {
      const res = await fetch("/api/crm/pipeline");
      const json = await res.json();
      if (json.success) {
        setColumns(json.data.columns);
        setStages(json.data.columns.map((c: PipelineColumn) => c.stage));
        setTotalValue(json.data.totalValue);
        setWeightedForecast(json.data.weightedForecast);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPipeline();
  }, [fetchPipeline]);

  // Filtered columns by search
  const filteredColumns = useMemo(() => {
    if (!search) return columns;
    const q = search.toLowerCase();
    return columns.map((col) => ({
      ...col,
      deals: col.deals.filter(
        (d) =>
          d.title?.toLowerCase().includes(q) ||
          d.value?.toString().includes(q)
      ),
    }));
  }, [columns, search]);

  // Resolve an ID (could be a stage or a deal) to a stage ID
  const resolveStageId = useCallback(
    (id: string): string | null => {
      if (stages.find((s) => s.id === id)) return id;
      for (const col of columns) {
        if (col.deals.find((d) => d.id === id)) return col.stage.id;
      }
      return null;
    },
    [stages, columns]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const dealId = String(event.active.id);
    for (const col of columns) {
      const deal = col.deals.find((d) => d.id === dealId);
      if (deal) {
        setActiveDeal(deal);
        break;
      }
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const overId = event.over?.id ? String(event.over.id) : null;
    if (!overId) {
      setActiveOverStageId(null);
      return;
    }
    setActiveOverStageId(resolveStageId(overId));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDeal(null);
    setActiveOverStageId(null);

    const { active, over } = event;
    if (!over) return;

    const dealId = String(active.id);
    const targetStageId = resolveStageId(String(over.id));
    if (!targetStageId) return;

    // Find current stage
    let currentStageId = "";
    for (const col of columns) {
      if (col.deals.find((d) => d.id === dealId)) {
        currentStageId = col.stage.id;
        break;
      }
    }
    if (currentStageId === targetStageId) return;

    const targetStage = stages.find((s) => s.id === targetStageId);

    // Optimistic update
    setColumns((prev) =>
      prev.map((col) => {
        if (col.stage.id === currentStageId) {
          const deal = col.deals.find((d) => d.id === dealId);
          return {
            ...col,
            deals: col.deals.filter((d) => d.id !== dealId),
            totalValue: col.totalValue - Number(deal?.value || 0),
            count: col.count - 1,
          };
        }
        if (col.stage.id === targetStageId) {
          const deal = columns.flatMap((c) => c.deals).find((d) => d.id === dealId);
          if (!deal) return col;
          return {
            ...col,
            deals: [...col.deals, deal],
            totalValue: col.totalValue + Number(deal.value || 0),
            count: col.count + 1,
          };
        }
        return col;
      })
    );

    // API call
    const res = await fetch(`/api/crm/deals/${dealId}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage_id: targetStageId }),
    });

    if (!res.ok) {
      toast.error(t("crm.pipeline.failedMove"));
      fetchPipeline();
    } else {
      toast.success(t("crm.pipeline.movedTo", { stage: targetStage?.name || "" }));
    }
  };

  const handleCreateDeal = async (values: Record<string, string>) => {
    const res = await fetch("/api/crm/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...Object.fromEntries(Object.entries(values).filter(([, v]) => v !== "")),
        stage_id: newDealStageId,
        value: Number(values.value) || 0,
      }),
    });
    const json = await res.json();
    if (json.success) {
      toast.success(t("crm.pipeline.dealCreated"));
      fetchPipeline();
    } else {
      toast.error(json.error || t("crm.pipeline.failed"));
      throw new Error(json.error);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-4 border-b">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="flex gap-4 p-4 overflow-x-auto flex-1">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-72 shrink-0 space-y-2">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (columns.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <EmptyState
          icon={Kanban}
          title={t("crm.pipeline.notSetUp")}
          description={t("crm.pipeline.beingConfigured")}
        />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      <PipelineToolbar
        totalValue={totalValue}
        weightedForecast={weightedForecast}
        search={search}
        onSearchChange={setSearch}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex gap-4 p-4 h-full min-w-min">
            {filteredColumns.map((column) => (
              <StageColumn
                key={column.stage.id}
                stage={column.stage}
                deals={column.deals}
                totalValue={column.totalValue}
                count={column.count}
                isOver={activeOverStageId === column.stage.id}
                onAddDeal={() => {
                  setNewDealStageId(column.stage.id);
                  setShowForm(true);
                }}
              />
            ))}
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeDeal && <DealCardOverlay deal={activeDeal} />}
        </DragOverlay>
      </DndContext>

      <EntityForm
        open={showForm}
        onOpenChange={setShowForm}
        title={t("crm.pipeline.title")}
        fields={dealFields}
        onSubmit={handleCreateDeal}
      />
    </div>
  );
}
