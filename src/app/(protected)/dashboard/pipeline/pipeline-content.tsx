"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "@/lib/i18n";
import { useWorkspace } from "@/contexts/team-context";
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
import { PipelineToolbar, type PipelineFilterOption, type PipelineActiveFilter } from "@/components/pipeline/pipeline-toolbar";
import { StageColumn } from "@/components/pipeline/stage-column";
import { LostReasonDialog } from "@/components/pipeline/lost-reason-dialog";
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
  const { currentWorkspace } = useWorkspace();

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
  const [activeFilters, setActiveFilters] = useState<PipelineActiveFilter[]>([]);
  const [teamMembers, setTeamMembers] = useState<{ account_id: string; name: string }[]>([]);

  // DnD state
  const [activeDeal, setActiveDeal] = useState<DealForCard | null>(null);
  const [activeOverStageId, setActiveOverStageId] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [newDealStageId, setNewDealStageId] = useState("");

  // Lost reason dialog state
  const [lostDialogOpen, setLostDialogOpen] = useState(false);
  const [pendingLostMove, setPendingLostMove] = useState<{
    dealId: string;
    currentStageId: string;
    targetStageId: string;
    targetStageName: string;
  } | null>(null);

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
      const [pipelineRes, membersRes] = await Promise.all([
        fetch("/api/crm/pipeline"),
        currentWorkspace?.id ? fetch(`/api/teams/${currentWorkspace.id}/members`) : Promise.resolve(null),
      ]);
      const pipelineJson = await pipelineRes.json();
      if (pipelineJson.success) {
        setColumns(pipelineJson.data.columns);
        setStages(pipelineJson.data.columns.map((c: PipelineColumn) => c.stage));
        setTotalValue(pipelineJson.data.totalValue);
        setWeightedForecast(pipelineJson.data.weightedForecast);
      }
      if (membersRes && membersRes.ok) {
        const membersJson = await membersRes.json();
        if (membersJson.success) {
          setTeamMembers(
            (membersJson.data || []).map((m: { account_id: string; accounts: { id: string; name: string; email: string } }) => ({
              account_id: m.account_id,
              name: m.accounts.name || m.accounts.email,
            }))
          );
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPipeline();
  }, [fetchPipeline]);

  // Filter options for toolbar
  const filterOptions: PipelineFilterOption[] = useMemo(() => {
    const opts: PipelineFilterOption[] = [];
    if (teamMembers.length > 0) {
      opts.push({
        field: "assigned_to",
        label: t("crm.pipeline.filters.assignedTo"),
        options: teamMembers.map((m) => ({ value: m.account_id, label: m.name })),
      });
    }
    opts.push({
      field: "win_probability",
      label: t("crm.pipeline.filters.winProb"),
      options: [
        { value: "hot", label: t("crm.pipeline.filters.hot") },
        { value: "warm", label: t("crm.pipeline.filters.warm") },
        { value: "at_risk", label: t("crm.pipeline.filters.atRisk") },
      ],
    });
    opts.push({
      field: "is_rotting",
      label: t("crm.pipeline.filters.rotting"),
      options: [
        { value: "true", label: t("crm.pipeline.filters.rottingOnly") },
      ],
    });
    return opts;
  }, [t, teamMembers]);

  const handleFilterAdd = useCallback((field: string, value: string) => {
    const opt = filterOptions.find((f) => f.field === field);
    const label = opt?.options.find((o) => o.value === value)?.label || value;
    setActiveFilters((prev) => [...prev.filter((f) => f.field !== field), { field, value, label }]);
  }, [filterOptions]);

  const handleFilterRemove = useCallback((field: string) => {
    setActiveFilters((prev) => prev.filter((f) => f.field !== field));
  }, []);

  // Apply filters then search
  const filteredColumns = useMemo(() => {
    let result = columns;

    // Apply active filters
    if (activeFilters.length > 0) {
      result = result.map((col) => ({
        ...col,
        deals: col.deals.filter((d) => {
          for (const f of activeFilters) {
            if (f.field === "assigned_to" && d.assigned_to !== f.value) return false;
            if (f.field === "win_probability") {
              const prob = d.ai_win_probability ?? 0;
              if (f.value === "hot" && prob < 70) return false;
              if (f.value === "warm" && (prob < 40 || prob >= 70)) return false;
              if (f.value === "at_risk" && prob >= 40) return false;
            }
            if (f.field === "is_rotting" && !d.is_rotting) return false;
          }
          return true;
        }),
      }));
    }

    // Apply search
    if (search) {
      const q = search.toLowerCase();
      result = result.map((col) => ({
        ...col,
        deals: col.deals.filter((d) => {
          if (d.title?.toLowerCase().includes(q)) return true;
          if (d.value?.toString().includes(q)) return true;
          if (d.companies?.name?.toLowerCase().includes(q)) return true;
          if (d.contacts) {
            const name = `${d.contacts.first_name} ${d.contacts.last_name || ""}`.toLowerCase();
            if (name.includes(q)) return true;
          }
          return false;
        }),
      }));
    }

    return result;
  }, [columns, activeFilters, search]);

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

    let currentStageId = "";
    for (const col of columns) {
      if (col.deals.find((d) => d.id === dealId)) {
        currentStageId = col.stage.id;
        break;
      }
    }
    if (currentStageId === targetStageId) return;

    const targetStage = stages.find((s) => s.id === targetStageId);

    // If target is a lost stage, show reason dialog first
    if (targetStage?.is_lost) {
      setPendingLostMove({ dealId, currentStageId, targetStageId, targetStageName: targetStage.name });
      setLostDialogOpen(true);
      return;
    }

    await moveDealToStage(dealId, currentStageId, targetStageId, targetStage?.name || "");
  };

  const moveDealToStage = async (
    dealId: string,
    currentStageId: string,
    targetStageId: string,
    targetStageName: string,
    lostReasonId?: string | null,
    lostReasonNote?: string
  ) => {
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

    const payload: Record<string, unknown> = { stage_id: targetStageId };
    if (lostReasonId) payload.lost_reason_id = lostReasonId;
    if (lostReasonNote) payload.lost_reason_note = lostReasonNote;

    const res = await fetch(`/api/crm/deals/${dealId}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      toast.error(t("crm.pipeline.failedMove"));
      fetchPipeline();
    } else {
      toast.success(t("crm.pipeline.movedTo", { stage: targetStageName }));
    }
  };

  const handleLostReasonConfirm = async (reasonId: string | null, note: string) => {
    setLostDialogOpen(false);
    if (!pendingLostMove) return;

    await moveDealToStage(
      pendingLostMove.dealId,
      pendingLostMove.currentStageId,
      pendingLostMove.targetStageId,
      pendingLostMove.targetStageName,
      reasonId,
      note
    );
    setPendingLostMove(null);
  };

  const handleLostReasonCancel = () => {
    setLostDialogOpen(false);
    setPendingLostMove(null);
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

  const handleQuickAdd = useCallback(async (stageId: string, title: string) => {
    const res = await fetch("/api/crm/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        stage_id: stageId,
        value: 0,
      }),
    });
    const json = await res.json();
    if (json.success) {
      toast.success(t("crm.pipeline.dealCreated"));
      fetchPipeline();
    } else {
      toast.error(json.error || t("crm.pipeline.quickAddFailed"));
      throw new Error(json.error);
    }
  }, [t, fetchPipeline]);

  // ── Loading ───────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-4 border-b">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="flex gap-0 flex-1">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex-1 min-w-[260px] border-r last:border-r-0 p-3 space-y-3">
              <Skeleton className="h-1 w-full rounded-full" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-3 w-16" />
              <div className="space-y-2 mt-4">
                <Skeleton className="h-[100px] w-full rounded-lg" />
                <Skeleton className="h-[100px] w-full rounded-lg" />
                <Skeleton className="h-[100px] w-full rounded-lg" />
              </div>
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
        dealCount={columns.reduce((sum, c) => sum + c.count, 0)}
        filterOptions={filterOptions}
        activeFilters={activeFilters}
        onFilterAdd={handleFilterAdd}
        onFilterRemove={handleFilterRemove}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex h-full min-w-min">
            {filteredColumns.map((column, i) => (
              <StageColumn
                key={column.stage.id}
                stage={column.stage}
                deals={column.deals}
                totalValue={column.totalValue}
                count={column.count}
                isOver={activeOverStageId === column.stage.id}
                isLast={i === filteredColumns.length - 1}
                onAddDeal={() => {
                  setNewDealStageId(column.stage.id);
                  setShowForm(true);
                }}
                onQuickAdd={handleQuickAdd}
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

      <LostReasonDialog
        open={lostDialogOpen}
        onConfirm={handleLostReasonConfirm}
        onCancel={handleLostReasonCancel}
      />
    </div>
  );
}
