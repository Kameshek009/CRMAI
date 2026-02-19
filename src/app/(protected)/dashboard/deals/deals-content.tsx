"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { ViewControls, type FilterOption, type ActiveFilter, type SortOption, type GroupByOption } from "@/components/frappe/view-controls";
import { DataTable, type Column } from "@/components/frappe/data-table";
import { KanbanBoard, type KanbanColumn } from "@/components/frappe/kanban-board";
import { GroupByView, type GroupByGroup } from "@/components/frappe/group-by-view";
import { StatusBadge } from "@/components/frappe/status-badge";
import { Handshake } from "lucide-react";
import { toast } from "sonner";
import type { ViewMode } from "@/types/crm";

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

const FILTER_OPTIONS: FilterOption[] = [
  {
    field: "status", label: "Status", type: "select",
    options: [
      { value: "open", label: "Open" },
      { value: "won", label: "Won" },
      { value: "lost", label: "Lost" },
    ],
  },
];

const SORT_OPTIONS: SortOption[] = [
  { field: "created_at", label: "Created" },
  { field: "title", label: "Title" },
  { field: "value", label: "Value" },
  { field: "expected_close_date", label: "Expected Close" },
  { field: "ai_win_probability", label: "Win %" },
];

const GROUP_BY_OPTIONS: GroupByOption[] = [
  { field: "status", label: "Status" },
];

const PAGE_SIZE = 50;

// ============================================================================
// Component
// ============================================================================

export function DealsContent() {
  const router = useRouter();

  const [deals, setDeals] = useState<DealData[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [stages, setStages] = useState<DealStage[]>([]);

  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [groupBy, setGroupBy] = useState<string | null>("status");

  const fetchDeals = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("sort_by", sortBy);
      params.set("sort_order", sortOrder);
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));
      for (const f of activeFilters) {
        params.set(`filter_${f.field}`, f.value);
      }
      const res = await fetch(`/api/crm/deals?${params}`);
      const json = await res.json();
      if (json.success) {
        setDeals(json.data);
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
    } finally {
      setIsLoading(false);
    }
  }, [search, sortBy, sortOrder, page, activeFilters]);

  useEffect(() => { fetchDeals(); }, [fetchDeals]);
  useEffect(() => { setPage(1); }, [search, activeFilters, sortBy, sortOrder]);

  // Also fetch stages separately on mount for kanban
  useEffect(() => {
    fetch("/api/crm/pipeline")
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data) {
          setStages(json.data.sort((a: DealStage, b: DealStage) => a.position - b.position));
        }
      })
      .catch(() => {});
  }, []);

  const handleFilterAdd = useCallback((field: string, value: string) => {
    const option = FILTER_OPTIONS.find(f => f.field === field);
    const optLabel = option?.options?.find(o => o.value === value)?.label || value;
    setActiveFilters(prev => {
      const next = prev.filter(f => f.field !== field);
      return [...next, { field, value, label: optLabel }];
    });
  }, []);

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
      toast.error("Failed to update deal stage");
      fetchDeals();
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value == null) return "—";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
  };

  const columns: Column<DealData>[] = useMemo(() => [
    {
      key: "title", label: "Title", sortable: true,
      render: (d) => (
        <div className="flex items-center gap-2">
          <Handshake className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-medium">{d.title}</span>
        </div>
      ),
    },
    {
      key: "deal_stages", label: "Stage",
      render: (d) => d.deal_stages ? (
        <span
          className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md"
          style={{ backgroundColor: `${d.deal_stages.color}15`, color: d.deal_stages.color }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: d.deal_stages.color }} />
          {d.deal_stages.name}
        </span>
      ) : "—",
    },
    {
      key: "value", label: "Value", sortable: true, align: "right",
      render: (d) => <span className="font-medium">{formatCurrency(d.value)}</span>,
    },
    {
      key: "contacts", label: "Contact",
      render: (d) => d.contacts ? `${d.contacts.first_name} ${d.contacts.last_name || ""}`.trim() : "—",
    },
    {
      key: "companies", label: "Organization",
      render: (d) => d.companies?.name || "—",
    },
    {
      key: "ai_win_probability", label: "Win %", sortable: true, align: "center",
      render: (d) => d.ai_win_probability != null ? (
        <span className="text-xs font-medium">{d.ai_win_probability}%</span>
      ) : "—",
    },
    {
      key: "status", label: "Status", sortable: true,
      render: (d) => <StatusBadge status={d.status} />,
    },
    {
      key: "expected_close_date", label: "Expected Close", sortable: true,
      render: (d) => d.expected_close_date
        ? new Date(d.expected_close_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : "—",
    },
  ], []);

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
      <PageHeader title="Deals" description={`${total} deal${total !== 1 ? "s" : ""}`} />

      <ViewControls
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search deals..."
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
        entityName={`deal${total !== 1 ? "s" : ""}`}
      />

      {viewMode === "table" && (
        <DataTable
          columns={columns}
          data={deals}
          loading={isLoading}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSortChange}
          onRowClick={(d) => router.push(`/dashboard/deals/${d.id}`)}
          page={page}
          pageSize={PAGE_SIZE}
          totalCount={total}
          onPageChange={setPage}
          emptyMessage={search || activeFilters.length ? "No matching deals" : "No deals yet"}
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
          emptyMessage="No deals to group"
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
    </PageContainer>
  );
}
