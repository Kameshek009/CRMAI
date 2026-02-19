"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { ViewControls, type FilterOption, type ActiveFilter, type SortOption, type GroupByOption } from "@/components/frappe/view-controls";
import { DataTable, type Column } from "@/components/frappe/data-table";
import { KanbanBoard, type KanbanColumn } from "@/components/frappe/kanban-board";
import { GroupByView, type GroupByGroup } from "@/components/frappe/group-by-view";
import { EntityForm } from "@/components/crm/entity-form";
import { companyFields } from "@/lib/crm/field-definitions";
import { BulkActionBar } from "@/components/crm/bulk-action-bar";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import { Building2 } from "lucide-react";
import { toast } from "sonner";
import type { ViewMode } from "@/types/crm";

// ============================================================================
// Types
// ============================================================================

interface CompanyData {
  id: string;
  name: string;
  industry: string | null;
  size: string | null;
  domain: string | null;
  ai_health_score: number;
  created_at: string;
}

// ============================================================================
// Constants
// ============================================================================

const FILTER_OPTIONS: FilterOption[] = [
  {
    field: "industry", label: "Industry", type: "text",
  },
  {
    field: "size", label: "Size", type: "select",
    options: [
      { value: "1-10", label: "1-10" },
      { value: "11-50", label: "11-50" },
      { value: "51-200", label: "51-200" },
      { value: "201-500", label: "201-500" },
      { value: "500+", label: "500+" },
    ],
  },
];

const SORT_OPTIONS: SortOption[] = [
  { field: "created_at", label: "Created" },
  { field: "name", label: "Name" },
  { field: "industry", label: "Industry" },
  { field: "ai_health_score", label: "Health Score" },
];

const GROUP_BY_OPTIONS: GroupByOption[] = [
  { field: "industry", label: "Industry" },
  { field: "size", label: "Size" },
];

const SIZE_KANBAN_COLUMNS: KanbanColumn[] = [
  { id: "1-10", title: "1-10", color: "bg-blue-500" },
  { id: "11-50", title: "11-50", color: "bg-cyan-500" },
  { id: "51-200", title: "51-200", color: "bg-emerald-500" },
  { id: "201-500", title: "201-500", color: "bg-amber-500" },
  { id: "500+", title: "500+", color: "bg-purple-500" },
];

const PAGE_SIZE = 50;

// ============================================================================
// Component
// ============================================================================

export function CompaniesContent() {
  const router = useRouter();

  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [groupBy, setGroupBy] = useState<string | null>("industry");

  const [showForm, setShowForm] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  const fetchCompanies = useCallback(async () => {
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
      const res = await fetch(`/api/crm/companies?${params}`);
      const json = await res.json();
      if (json.success) {
        setCompanies(json.data);
        setTotal(json.total || 0);
      }
    } finally {
      setIsLoading(false);
    }
  }, [search, sortBy, sortOrder, page, activeFilters]);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);
  useEffect(() => { setSelectedIds(new Set()); }, [search, activeFilters]);
  useEffect(() => { setPage(1); }, [search, activeFilters, sortBy, sortOrder]);

  const handleCreate = async (values: Record<string, string>) => {
    const res = await fetch("/api/crm/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const json = await res.json();
    if (json.success) {
      toast.success("Organization created");
      fetchCompanies();
    } else {
      toast.error(json.error || "Failed to create organization");
      throw new Error(json.error);
    }
  };

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

  const handleBulkDelete = async () => {
    setIsBulkLoading(true);
    try {
      const ids = Array.from(selectedIds);
      const res = await fetch("/api/crm/companies/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", ids }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Deleted ${ids.length} organization${ids.length !== 1 ? "s" : ""}`);
        setSelectedIds(new Set());
        fetchCompanies();
      } else {
        toast.error(json.error || "Failed to delete");
      }
    } finally {
      setIsBulkLoading(false);
      setConfirmDelete(false);
    }
  };

  const healthScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600";
    if (score >= 60) return "text-blue-600";
    if (score >= 40) return "text-amber-600";
    return "text-red-600";
  };

  const columns: Column<CompanyData>[] = useMemo(() => [
    {
      key: "name", label: "Name", sortable: true,
      render: (c) => (
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="font-medium">{c.name}</span>
        </div>
      ),
    },
    { key: "domain", label: "Domain" },
    { key: "industry", label: "Industry", sortable: true },
    { key: "size", label: "Size" },
    {
      key: "ai_health_score", label: "Health", sortable: true, align: "center",
      render: (c) => (
        <span className={`text-xs font-semibold ${healthScoreColor(c.ai_health_score)}`}>
          {c.ai_health_score || 0}
        </span>
      ),
    },
  ], []);

  const groups: GroupByGroup<CompanyData>[] = useMemo(() => {
    if (!groupBy) return [];
    const map = new Map<string, CompanyData[]>();
    for (const c of companies) {
      const key = String((c as unknown as Record<string, unknown>)[groupBy] ?? "—");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return Array.from(map.entries()).map(([key, items]) => ({
      key, label: key, count: items.length, items,
    }));
  }, [companies, groupBy]);

  const kanbanColumns: KanbanColumn[] = useMemo(() =>
    SIZE_KANBAN_COLUMNS.map(col => ({
      ...col,
      count: companies.filter(c => c.size === col.id).length,
    })), [companies]);

  const kanbanItems = useMemo(() =>
    companies.map(c => ({ ...c, columnId: c.size || "1-10" })), [companies]);

  return (
    <PageContainer>
      <PageHeader title="Organizations" description={`${total} organization${total !== 1 ? "s" : ""}`} />

      <ViewControls
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search organizations..."
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
        entityName={`organization${total !== 1 ? "s" : ""}`}
        onAdd={() => setShowForm(true)}
        addLabel="New Organization"
      />

      {viewMode === "table" && (
        <DataTable
          columns={columns}
          data={companies}
          loading={isLoading}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSortChange}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onRowClick={(c) => router.push(`/dashboard/companies/${c.id}`)}
          page={page}
          pageSize={PAGE_SIZE}
          totalCount={total}
          onPageChange={setPage}
          emptyMessage={search || activeFilters.length > 0 ? "No matching organizations" : "No organizations yet"}
        />
      )}

      {viewMode === "kanban" && !isLoading && (
        <KanbanBoard
          columns={kanbanColumns}
          cards={kanbanItems}
          renderCard={(c) => (
            <div
              className="cursor-pointer"
              onClick={() => router.push(`/dashboard/companies/${c.id}`)}
            >
              <span className="text-sm font-medium">{c.name}</span>
              {c.industry && <p className="text-xs text-muted-foreground">{c.industry}</p>}
              <p className={`text-xs font-semibold mt-1 ${healthScoreColor(c.ai_health_score)}`}>
                Health: {c.ai_health_score || 0}
              </p>
            </div>
          )}
        />
      )}

      {viewMode === "group_by" && (
        <GroupByView
          groups={groups}
          emptyMessage="No organizations to group"
          renderItem={(c) => (
            <div
              key={c.id}
              className="flex items-center justify-between px-4 py-2 hover:bg-muted/30 cursor-pointer rounded-md transition-colors"
              onClick={() => router.push(`/dashboard/companies/${c.id}`)}
            >
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <span className="text-sm font-medium">{c.name}</span>
                  {c.domain && <p className="text-xs text-muted-foreground">{c.domain}</p>}
                </div>
              </div>
              <span className={`text-xs font-semibold ${healthScoreColor(c.ai_health_score)}`}>{c.ai_health_score || 0}</span>
            </div>
          )}
        />
      )}

      <EntityForm
        open={showForm}
        onOpenChange={setShowForm}
        title="New Organization"
        fields={companyFields}
        onSubmit={handleCreate}
      />

      <BulkActionBar
        selectedCount={selectedIds.size}
        onDeselectAll={() => setSelectedIds(new Set())}
        actions={[
          { label: "Delete", variant: "destructive", onClick: () => setConfirmDelete(true) },
        ]}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete organizations"
        description={`Are you sure you want to delete ${selectedIds.size} organization${selectedIds.size !== 1 ? "s" : ""}?`}
        confirmLabel="Delete"
        variant="destructive"
        isLoading={isBulkLoading}
        onConfirm={handleBulkDelete}
      />
    </PageContainer>
  );
}
