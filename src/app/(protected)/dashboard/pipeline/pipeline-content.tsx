"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  useDroppable,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  rectIntersection,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DealCard, type DealForCard } from "@/components/crm/deal-card";
import { EntityForm, type FormField } from "@/components/crm/entity-form";
import { EmptyState } from "@/components/crm/empty-state";
import { Plus, Kanban, DollarSign, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Types ───────────────────────────────────────────────────────────────

interface PipelineStage {
  id: string;
  name: string;
  color: string;
  position: number;
  is_won: boolean;
  is_lost: boolean;
}

interface PipelineColumn {
  stage: PipelineStage;
  deals: DealForCard[];
  totalValue: number;
  count: number;
}

// ── Droppable Column ────────────────────────────────────────────────────

function StageColumn({
  column,
  isOver,
  onAddDeal,
}: {
  column: PipelineColumn;
  isOver: boolean;
  onAddDeal: () => void;
}) {
  const { setNodeRef } = useDroppable({ id: column.stage.id });

  return (
    <div className="w-72 shrink-0 flex flex-col">
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 rounded-t-xl bg-card border border-b-0"
        style={{ borderTopColor: column.stage.color || "#6b7280", borderTopWidth: 3 }}
      >
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">{column.stage.name}</h3>
            <span className="text-[11px] bg-muted px-1.5 py-0.5 rounded-full font-medium tabular-nums">
              {column.count}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            ${column.totalValue.toLocaleString()}
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
          "flex-1 p-2 space-y-2 min-h-[150px] max-h-[calc(100vh-280px)] overflow-y-auto rounded-b-xl border border-t-0 transition-colors duration-200",
          isOver
            ? "bg-primary/5 border-primary/40 ring-2 ring-primary/20"
            : "bg-muted/20"
        )}
      >
        {column.deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} />
        ))}

        {column.deals.length === 0 && !isOver && (
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

// ── Pipeline Page ───────────────────────────────────────────────────────

const dealFields: FormField[] = [
  { name: "title", label: "Deal Title", type: "text", required: true, placeholder: "New deal" },
  { name: "value", label: "Value ($)", type: "number", placeholder: "10000" },
  { name: "expected_close_date", label: "Expected Close", type: "date" },
  { name: "description", label: "Description", type: "textarea" },
];

export function PipelineContent() {
  const [columns, setColumns] = useState<PipelineColumn[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [weightedForecast, setWeightedForecast] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // DnD state
  const [activeDeal, setActiveDeal] = useState<DealForCard | null>(null);
  const [activeOverStageId, setActiveOverStageId] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [newDealStageId, setNewDealStageId] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
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
      toast.error("Failed to move deal");
      fetchPipeline();
    } else {
      toast.success(`Moved to ${targetStage?.name}`);
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
      toast.success("Deal created");
      fetchPipeline();
    } else {
      toast.error(json.error || "Failed");
      throw new Error(json.error);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <PageContainer>
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="flex gap-4 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-72 shrink-0 space-y-2">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </PageContainer>
    );
  }

  if (columns.length === 0) {
    return (
      <PageContainer>
        <EmptyState
          icon={Kanban}
          title="Pipeline not set up"
          description="Your deal stages are being configured."
        />
      </PageContainer>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <PageContainer>
      <PageHeader title="Pipeline" description="Drag deals between stages">
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1 font-medium">
            <DollarSign className="size-4" />
            {totalValue.toLocaleString()}
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <TrendingUp className="size-4" />
            ${weightedForecast.toLocaleString()} weighted
          </span>
        </div>
      </PageHeader>

      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2 snap-x snap-mandatory md:snap-none">
          {columns.map((column) => (
            <StageColumn
              key={column.stage.id}
              column={column}
              isOver={activeOverStageId === column.stage.id}
              onAddDeal={() => {
                setNewDealStageId(column.stage.id);
                setShowForm(true);
              }}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeDeal && <DealCard deal={activeDeal} isOverlay />}
        </DragOverlay>
      </DndContext>

      <EntityForm
        open={showForm}
        onOpenChange={setShowForm}
        title="New Deal"
        fields={dealFields}
        onSubmit={handleCreateDeal}
      />
    </PageContainer>
  );
}
