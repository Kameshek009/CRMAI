"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { ViewControls, type FilterOption, type ActiveFilter, type SortOption, type GroupByOption } from "@/components/frappe/view-controls";
import { DataTable, type Column } from "@/components/frappe/data-table";
import { KanbanBoard, type KanbanColumn } from "@/components/frappe/kanban-board";
import { GroupByView, type GroupByGroup } from "@/components/frappe/group-by-view";
import { StatusBadge } from "@/components/frappe/status-badge";
import { EntityForm, type FormField } from "@/components/crm/entity-form";
import { BulkActionBar } from "@/components/crm/bulk-action-bar";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import { Handshake } from "lucide-react";
import { EntityHoverCard } from "@/components/crm/entity-hover-card";
import { QuickFilters } from "@/components/frappe/quick-filters";
import { toast } from "sonner";
import type { ViewMode } from "@/types/crm";
import { useTranslation } from "@/lib/i18n";

// ============================================================================
// Types
// ============================================================================

interface DealStage {
  id: string;
  name: string;
  color: string;
  position: number;
  is_won: boolean;
  is_lost: boolean;
}

interface DealData {
  id: string;
  title: string;
  value: number | null;
  status: string;
  stage_id: string;
  expected_close_date: string | null;
  ai_win_probability: number | null;
  deal_stages: DealStage | null;
  contacts: { id: string; first_name: string; last_name: string | null } | null;
  companies: { id: string; name: string } | null;
  created_at: string;
}

// ============================================================================
// Constants
// ============================================================================

const PAGE_SIZE = 50;

// ============================================================================
// Component
// ============================================================================

export function DealsContent() {
  const { t } = useTranslation();
  const router = useRouter();

  const [deals, setDeals] = useState<DealData[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const pageRef = useRef(1);
  const [stages, setStages] = useState<DealStage[]>([]);
  const [showForm, setShowForm] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [groupBy, setGroupBy] = useState<string | null>("status");

  // Bulk
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  const FILTER_OPTIONS: FilterOption[] = useMemo(() => [
    {
      field: "status", label: t("crm.deals.fields.status"), type: "select" as const,
      options: [
        { value: "open", label: t("crm.deals.statuses.open") },
        { value: "won", label: t("crm.deals.statuses.won") },
        { value: "lost", label: t("crm.deals.statuses.lost") },
      ],
    },
  ], [t]);

  const SORT_OPTIONS: SortOption[] = useMemo(() => [
    { field: "created_at", label: t("crm.deals.sort.created") },
    { field: "title", label: t("crm.deals.sort.title") },
    { field: "value", label: t("crm.deals.sort.value") },
    { field: "expected_close_date", label: t("crm.deals.sort.expectedClose") },
    { field: "ai_win_probability", label: t("crm.deals.sort.winPercent") },
  ], [t]);

  const GROUP_BY_OPTIONS: GroupByOption[] = useMemo(() => [
    { field: "status", label: t("crm.deals.groupBy.status") },
  ], [t]);

  const dealFormFields: FormField[] = useMemo(() => [
    { name: "title", label: t("crm.deals.fields.dealTitle"), type: "text" as const, required: true, placeholder: t("crm.deals.new") },
    { name: "value", label: t("crm.deals.fields.value"), type: "number" as const, placeholder: "10000" },
    { name: "expected_close_date", label: t("crm.deals.fields.expectedClose"), type: "date" as const },
    { name: "description", label: t("crm.deals.fields.description"), type: "textarea" as const },
  ], [t]);

  const abortRef = useRef<AbortController | null>(null);

  const fetchDeals = useCallback(async (pageNum: number, append: boolean, signal?: AbortSignal) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("sort_by", sortBy);
      params.set("sort_order", sortOrder);
      params.set("page", String(pageNum));
      params.set("limit", String(PAGE_SIZE));
      for (const f of activeFilters) {
        params.set(`filter_${f.field}`, f.value);
      }
      const res = await fetch(`/api/crm/deals?${params}`, { signal });
      const json = await res.json();
      if (json.success) {
        if (append) {
          setDeals(prev => [...prev, ...json.data]);
        } else {
          setDeals(json.data);
        }
        setTotal(json.total || 0);
        // Extract unique stages
        const stageMap = new Map<string, DealStage>();
        for (const d of json.data) {
          if (d.deal_stages && !stageMap.has(d.deal_stages.id)) {
            stageMap.set(d.deal_stages.id, d.deal_stages);
          }
        }
        const sorted = Array.from(stageMap.values()).sort((a, b) => a.position - b.position);
        if (sorted.length > 0) setStages(sorted);
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [search, sortBy, sortOrder, activeFilters]);

  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    pageRef.current = 1;
    fetchDeals(1, false, abortRef.current.signal);
    return () => { abortRef.current?.abort(); };
  }, [fetchDeals]);
  useEffect(() => { setSelectedIds(new Set()); }, [search, activeFilters]);

  const handleLoadMore = useCallback(() => {
    if (isLoadingMore || deals.length >= total) return;
    const nextPage = pageRef.current + 1;
    pageRef.current = nextPage;
    fetchDeals(nextPage, true);
  }, [isLoadingMore, deals.length, total, fetchDeals]);

  // Also fetch stages separately on mount for kanban + create form
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/crm/pipeline", { signal: controller.signal })
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data?.columns) {
          const parsed = json.data.columns.map((c: { stage: DealStage }) => c.stage);
          setStages(parsed.sort((a: DealStage, b: DealStage) => a.position - b.position));
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const handleFilterAdd = useCallback((field: string, value: string) => {
    const option = FILTER_OPTIONS.find(f => f.field === field);
    const optLabel = option?.options?.find(o => o.value === value)?.label || value;
    setActiveFilters(prev => {
      const next = prev.filter(f => f.field !== field);
      return [...next, { field, value, label: optLabel }];
    });
  }, [FILTER_OPTIONS]);

  const handleFilterRemove = useCallback((field: string) => {
    setActiveFilters(prev => prev.filter(f => f.field !== field));
  }, []);

  const handleSortChange = useCallback((field: string, order: "asc" | "desc") => {
    setSortBy(field);
    setSortOrder(order);
  }, []);

  const handleKanbanMove = async (itemId: string, toStageId: string) => {
    setDeals(prev => prev.map(d => d.id === itemId ? { ...d, stage_id: toStageId } : d));
    const res = await fetch(`/api/crm/deals/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage_id: toStageId }),
    });
    if (!res.ok) {
      toast.error(t("crm.deals.failedStageUpdate"));
      pageRef.current = 1; fetchDeals(1, false);
    }
  };

  const handleCreateDeal = async (values: Record<string, string>) => {
    // Use the first stage (Lead) by default
    const defaultStage = stages.length > 0
      ? stages.reduce((a, b) => a.position < b.position ? a : b)
      : null;

    if (!defaultStage) {
      toast.error(t("crm.deals.noStages"));
      throw new Error("No pipeline stages");
    }

    const res = await fetch("/api/crm/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...Object.fromEntries(Object.entries(values).filter(([, v]) => v !== "")),
        stage_id: defaultStage.id,
        value: Number(values.value) || 0,
      }),
    });
    const json = await res.json();
    if (json.success) {
      toast.success(t("crm.deals.created"));
      pageRef.current = 1; fetchDeals(1, false);
    } else {
      toast.error(json.error || t("common.failed"));
      throw new Error(json.error);
    }
  };

  const handleBulkDelete = async () => {
    setIsBulkLoading(true);
    try {
      const ids = Array.from(selectedIds);
      const res = await fetch("/api/crm/deals/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", ids }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(t("crm.deals.bulkDeleted", { count: ids.length }));
        setSelectedIds(new Set());
        pageRef.current = 1; fetchDeals(1, false);
      } else {
        toast.error(json.error || t("crm.deals.bulkDeleteFailed"));
      }
    } finally {
      setIsBulkLoading(false);
      setConfirmDelete(false);
    }
  };

  const handleBulkStatusChange = async (status: string) => {
    setIsBulkLoading(true);
    try {
      const ids = Array.from(selectedIds);
      const res = await fetch("/api/crm/deals/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_status", ids, status }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(t("crm.deals.bulkUpdated", { count: ids.length }));
        setSelectedIds(new Set());
        pageRef.current = 1; fetchDeals(1, false);
      } else {
        toast.error(json.error || t("crm.deals.bulkUpdateFailed"));
      }
    } finally {
      setIsBulkLoading(false);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value == null) return "—";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
  };

  const columns: Column<DealData>[] = useMemo(() => [
    {
      key: "title", label: t("crm.deals.fields.title"), sortable: true,
      render: (d) => (
        <div className="flex items-center gap-2">
          <Handshake className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-medium">{d.title}</span>
        </div>
      ),
    },
    {
      key: "deal_stages", label: t("crm.deals.fields.stage"),
      render: (d) => {
        if (!d.deal_stages) return "—";
        const stageIdx = stages.findIndex(s => s.id === d.stage_id);
        const progress = stages.length > 1 ? Math.round(((stageIdx + 1) / stages.length) * 100) : 0;
        return (
          <div className="space-y-1">
            <span
              className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md"
              style={{ backgroundColor: `${d.deal_stages.color}15`, color: d.deal_stages.color }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: d.deal_stages.color }} />
              {d.deal_stages.name}
            </span>
            <div className="h-1 w-16 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${progress}%`, backgroundColor: d.deal_stages.color }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: "value", label: t("crm.deals.fields.value"), sortable: true, align: "right",
      render: (d) => <span className="font-medium">{formatCurrency(d.value)}</span>,
    },
    {
      key: "contacts", label: t("crm.deals.fields.contact"),
      render: (d) => d.contacts ? (
        <EntityHoverCard entityType="contact" entityId={d.contacts.id}>
          <span className="hover:underline cursor-pointer">{d.contacts.first_name} {d.contacts.last_name || ""}</span>
        </EntityHoverCard>
      ) : "—",
    },
    {
      key: "companies", label: t("crm.deals.fields.organization"),
      render: (d) => d.companies ? (
        <EntityHoverCard entityType="company" entityId={d.companies.id}>
          <span className="hover:underline cursor-pointer">{d.companies.name}</span>
        </EntityHoverCard>
      ) : "—",
    },
    {
      key: "ai_win_probability", label: t("crm.deals.fields.winPercent"), sortable: true, align: "center",
      render: (d) => d.ai_win_probability != null ? (
        <span className="text-xs font-medium">{d.ai_win_probability}%</span>
      ) : "—",
    },
    {
      key: "status", label: t("crm.deals.fields.status"), sortable: true,
      render: (d) => <StatusBadge status={d.status} />,
    },
    {
      key: "expected_close_date", label: t("crm.deals.fields.expectedClose"), sortable: true,
      render: (d) => d.expected_close_date
        ? new Date(d.expected_close_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : "—",
    },
  ], [t]);

  const groups: GroupByGroup<DealData>[] = useMemo(() => {
    if (!groupBy) return [];
    const map = new Map<string, DealData[]>();
    for (const d of deals) {
      let key: string;
      if (groupBy === "stage") {
        key = d.deal_stages?.name || "Unknown";
      } else {
        key = String((d as unknown as Record<string, unknown>)[groupBy] ?? "—");
      }
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    }
    return Array.from(map.entries()).map(([key, items]) => ({
      key, label: key, count: items.length, items,
    }));
  }, [deals, groupBy]);

  const kanbanColumns: KanbanColumn[] = useMemo(() =>
    stages.map(s => ({
      id: s.id,
      title: s.name,
      color: `bg-[${s.color}]`,
      count: deals.filter(d => d.stage_id === s.id).length,
      subtitle: formatCurrency(deals.filter(d => d.stage_id === s.id).reduce((sum, d) => sum + (d.value || 0), 0)),
    })), [stages, deals]);

  const kanbanItems = useMemo(() =>
    deals.map(d => ({ ...d, columnId: d.stage_id })), [deals]);

  return (
    <PageContainer>
      <PageHeader title={t("crm.deals.title")} description={`${total}`} />

      <ViewControls
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t("crm.deals.searchPlaceholder")}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        filterOptions={FILTER_OPTIONS}
        activeFilters={activeFilters}
        onFilterAdd={handleFilterAdd}
        onFilterRemove={handleFilterRemove}
        onFiltersClear={() => setActiveFilters([])}
        sortOptions={SORT_OPTIONS}
        currentSort={sortBy}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
        groupByOptions={GROUP_BY_OPTIONS}
        currentGroupBy={groupBy}
        onGroupByChange={setGroupBy}
        totalCount={total}
        onAdd={() => setShowForm(true)}
        addLabel={t("crm.deals.new")}
        featureLimitKey="deals"
      />

      <QuickFilters
        options={FILTER_OPTIONS[0]?.options?.map(o => ({
          value: o.value,
          label: o.label,
          count: deals.filter(d => d.status === o.value).length,
        })) || []}
        activeValue={activeFilters.find(f => f.field === "status")?.value || null}
        onChange={(value) => {
          if (value) {
            handleFilterAdd("status", value);
          } else {
            handleFilterRemove("status");
          }
        }}
      />

      {viewMode === "table" && (
        <DataTable
          columns={columns}
          data={deals}
          loading={isLoading}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSortChange}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onRowClick={(d) => router.push(`/dashboard/deals/${d.id}`)}
          totalCount={total}
          onLoadMore={handleLoadMore}
          isLoadingMore={isLoadingMore}
          hasMore={deals.length < total}
          emptyMessage={search || activeFilters.length ? t("crm.deals.noMatching") : t("crm.deals.noYet")}
        />
      )}

      {viewMode === "kanban" && !isLoading && (
        <KanbanBoard
          columns={kanbanColumns}
          cards={kanbanItems}
          onCardMove={(id, _from, to) => handleKanbanMove(id, to)}
          renderCard={(d) => (
            <div
              className="cursor-pointer"
              onClick={() => router.push(`/dashboard/deals/${d.id}`)}
            >
              <span className="text-sm font-medium">{d.title}</span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs font-medium">{formatCurrency(d.value)}</span>
                <StatusBadge status={d.status} />
              </div>
              {d.companies?.name && (
                <p className="text-xs text-muted-foreground mt-0.5">{d.companies.name}</p>
              )}
            </div>
          )}
        />
      )}

      {viewMode === "group_by" && (
        <GroupByView
          groups={groups}
          emptyMessage={t("crm.deals.noGroup")}
          renderItem={(d) => (
            <div
              key={d.id}
              className="flex items-center justify-between px-4 py-2 hover:bg-muted/30 cursor-pointer rounded-md transition-colors"
              onClick={() => router.push(`/dashboard/deals/${d.id}`)}
            >
              <div className="flex items-center gap-3">
                <Handshake className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <span className="text-sm font-medium">{d.title}</span>
                  {d.companies?.name && <p className="text-xs text-muted-foreground">{d.companies.name}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">{formatCurrency(d.value)}</span>
                <StatusBadge status={d.status} />
              </div>
            </div>
          )}
        />
      )}
      <EntityForm
        open={showForm}
        onOpenChange={setShowForm}
        title={t("crm.deals.new")}
        fields={dealFormFields}
        onSubmit={handleCreateDeal}
      />

      <BulkActionBar
        selectedCount={selectedIds.size}
        onDeselectAll={() => setSelectedIds(new Set())}
        actions={[
          {
            label: t("crm.deals.changeStatus"),
            dropdown: [
              { label: t("crm.deals.statuses.open"), value: "open" },
              { label: t("crm.deals.statuses.won"), value: "won" },
              { label: t("crm.deals.statuses.lost"), value: "lost" },
            ],
            onDropdownSelect: handleBulkStatusChange,
          },
          {
            label: t("common.delete"),
            variant: "destructive",
            onClick: () => setConfirmDelete(true),
          },
        ]}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t("crm.deals.deleteTitle")}
        description={t("crm.deals.deleteConfirm", { count: selectedIds.size })}
        confirmLabel={t("common.delete")}
        variant="destructive"
        isLoading={isBulkLoading}
        onConfirm={handleBulkDelete}
      />
    </PageContainer>
  );
}
