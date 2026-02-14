"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DealCard } from "@/components/crm/deal-card";
import { EntityForm, type FormField } from "@/components/crm/entity-form";
import { EmptyState } from "@/components/crm/empty-state";
import { Plus, Kanban, DollarSign, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface PipelineStage {
  id: string;
  name: string;
  color: string;
  position: number;
  is_won: boolean;
  is_lost: boolean;
}

interface PipelineDeal {
  id: string;
  title: string;
  value: number;
  ai_win_probability: number;
  expected_close_date: string | null;
  stage_id: string;
  contacts: { id: string; first_name: string; last_name: string | null } | null;
  companies: { id: string; name: string } | null;
}

interface PipelineColumn {
  stage: PipelineStage;
  deals: PipelineDeal[];
  totalValue: number;
  count: number;
}

export function PipelineContent() {
  const [columns, setColumns] = useState<PipelineColumn[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [weightedForecast, setWeightedForecast] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [activeDeal, setActiveDeal] = useState<PipelineDeal | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newDealStageId, setNewDealStageId] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const fetchPipeline = useCallback(async () => {
    const res = await fetch("/api/crm/pipeline");
    const json = await res.json();
    if (json.success) {
      setColumns(json.data.columns);
      setStages(json.data.columns.map((c: PipelineColumn) => c.stage));
      setTotalValue(json.data.totalValue);
      setWeightedForecast(json.data.weightedForecast);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchPipeline();
  }, [fetchPipeline]);

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

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDeal(null);
    const { active, over } = event;
    if (!over) return;

    const dealId = String(active.id);
    const targetStageId = String(over.id);

    // Find current stage
    let currentStageId = "";
    for (const col of columns) {
      if (col.deals.find((d) => d.id === dealId)) {
        currentStageId = col.stage.id;
        break;
      }
    }

    // Check if dropped on a stage column (not a deal)
    const targetStage = stages.find((s) => s.id === targetStageId);
    if (!targetStage || currentStageId === targetStageId) return;

    // Optimistic update
    setColumns((prev) =>
      prev.map((col) => {
        if (col.stage.id === currentStageId) {
          const deal = col.deals.find((d) => d.id === dealId)!;
          return {
            ...col,
            deals: col.deals.filter((d) => d.id !== dealId),
            totalValue: col.totalValue - Number(deal?.value || 0),
            count: col.count - 1,
          };
        }
        if (col.stage.id === targetStageId) {
          const deal = columns
            .flatMap((c) => c.deals)
            .find((d) => d.id === dealId)!;
          return {
            ...col,
            deals: [...col.deals, { ...deal, stage_id: targetStageId }],
            totalValue: col.totalValue + Number(deal?.value || 0),
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
      fetchPipeline(); // Revert
    } else {
      toast.success(`Moved to ${targetStage.name}`);
    }
  };

  const dealFields: FormField[] = [
    { name: "title", label: "Deal Title", type: "text", required: true, placeholder: "New deal" },
    { name: "value", label: "Value ($)", type: "number", placeholder: "10000" },
    { name: "expected_close_date", label: "Expected Close", type: "date" },
    { name: "description", label: "Description", type: "textarea" },
  ];

  const handleCreateDeal = async (values: Record<string, string>) => {
    const res = await fetch("/api/crm/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
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

  if (isLoading) {
    return (
      <PageContainer>
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="flex gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-96 w-64 shrink-0" />
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

  return (
    <PageContainer>
      <PageHeader title="Pipeline" description="Drag deals between stages">
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1">
            <DollarSign className="size-4" />
            ${totalValue.toLocaleString()} total
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <TrendingUp className="size-4" />
            ${weightedForecast.toLocaleString()} weighted
          </span>
        </div>
      </PageHeader>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((column) => (
            <div key={column.stage.id} className="w-72 shrink-0">
              <SortableContext
                id={column.stage.id}
                items={column.deals.map((d) => d.id)}
                strategy={verticalListSortingStrategy}
              >
                <Card className="p-0">
                  {/* Column header */}
                  <div
                    className="flex items-center justify-between p-3 border-b"
                    style={{ borderTopColor: column.stage.color, borderTopWidth: 3 }}
                  >
                    <div>
                      <h3 className="text-sm font-semibold">{column.stage.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {column.count} deal{column.count !== 1 ? "s" : ""} &middot; ${column.totalValue.toLocaleString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => {
                        setNewDealStageId(column.stage.id);
                        setShowForm(true);
                      }}
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>

                  {/* Deals — droppable area */}
                  <div
                    className="p-2 space-y-2 min-h-[200px]"
                    id={column.stage.id}
                    data-stage-id={column.stage.id}
                  >
                    {column.deals.map((deal) => (
                      <DealCard
                        key={deal.id}
                        id={deal.id}
                        title={deal.title}
                        value={Number(deal.value)}
                        aiWinProbability={deal.ai_win_probability}
                        contactName={
                          deal.contacts
                            ? `${deal.contacts.first_name} ${deal.contacts.last_name || ""}`.trim()
                            : null
                        }
                        companyName={deal.companies?.name}
                        expectedCloseDate={deal.expected_close_date}
                      />
                    ))}
                  </div>
                </Card>
              </SortableContext>
            </div>
          ))}
        </div>

        <DragOverlay>
          {activeDeal && (
            <DealCard
              id={activeDeal.id}
              title={activeDeal.title}
              value={Number(activeDeal.value)}
              aiWinProbability={activeDeal.ai_win_probability}
              contactName={null}
              companyName={null}
              isDraggable={false}
            />
          )}
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
