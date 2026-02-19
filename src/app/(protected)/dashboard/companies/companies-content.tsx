"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { ViewControls, type FilterOption, type ActiveFilter, type SortOption, type GroupByOption } from "@/components/frappe/view-controls";
import { DataTable, type Column } from "@/components/frappe/data-table";
import { KanbanBoard, type KanbanColumn } from "@/components/frappe/kanban-board";
import { GroupByView, type GroupByGroup } from "@/components/frappe/group-by-view";
import { EntityForm } from "@/components/crm/entity-form";
import { getCompanyFields } from "@/lib/crm/field-definitions";
import { useTranslation } from "@/lib/i18n";
import { BulkActionBar } from "@/components/crm/bulk-action-bar";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import { Building2 } from "lucide-react";
import { toast } from "sonner";
import { handleApiError } from "@/lib/crm/handle-api-error";
import { useFeatureLimitStore } from "@/stores/feature-limit-store";
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
  created_at: string;
}

// ============================================================================
// Constants
// ============================================================================

const PAGE_SIZE = 50;

// ============================================================================
// Component
// ============================================================================

export function CompaniesContent() {
  const router = useRouter();
  const { t } = useTranslation();
  const companyFields = useMemo(() => getCompanyFields(t), [t]);

  const FILTER_OPTIONS: FilterOption[] = useMemo(() => [
    {
      field: "industry", label: t("crm.companies.fields.industry"), type: "text" as const,
    },
    {
      field: "size", label: t("crm.companies.groupBy.size"), type: "select" as const,
      options: [
        { value: "1-10", label: "1-10" },
        { value: "11-50", label: "11-50" },
        { value: "51-200", label: "51-200" },
        { value: "201-500", label: "201-500" },
        { value: "500+", label: "500+" },
      ],
    },
  ], [t]);

  const SORT_OPTIONS: SortOption[] = useMemo(() => [
    { field: "created_at", label: t("crm.companies.sort.created") },
    { field: "name", label: t("crm.companies.sort.name") },
    { field: "industry", label: t("crm.companies.sort.industry") },
  ], [t]);

  const GROUP_BY_OPTIONS: GroupByOption[] = useMemo(() => [
    { field: "industry", label: t("crm.companies.groupBy.industry") },
    { field: "size", label: t("crm.companies.groupBy.size") },
  ], [t]);

  const SIZE_KANBAN_COLUMNS: KanbanColumn[] = useMemo(() => [
    { id: "1-10", title: "1-10", color: "bg-blue-500" },
    { id: "11-50", title: "11-50", color: "bg-cyan-500" },
    { id: "51-200", title: "51-200", color: "bg-emerald-500" },
    { id: "201-500", title: "201-500", color: "bg-amber-500" },
    { id: "500+", title: "500+", color: "bg-purple-500" },
  ], []);

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
      toast.success(t("crm.companies.created"));
      useFeatureLimitStore.getState().incrementUsage("companies");
      fetchCompanies();
    } else {
      handleApiError(json);
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
  }, [FILTER_OPTIONS]);

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

  const columns: Column<CompanyData>[] = useMemo(() => [
    {
      key: "name", label: t("crm.companies.fields.name"), sortable: true,
      render: (c) => (
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="font-medium">{c.name}</span>
        </div>
      ),
    },
    { key: "domain", label: t("crm.companies.fields.domain") },
    { key: "industry", label: t("crm.companies.fields.industry"), sortable: true },
    { key: "size", label: t("crm.companies.groupBy.size") },
  ], [t]);

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
    })), [companies, SIZE_KANBAN_COLUMNS]);

  const kanbanItems = useMemo(() =>
    companies.map(c => ({ ...c, columnId: c.size || "1-10" })), [companies]);

  return (
    <PageContainer>
      <PageHeader title={t("crm.companies.title")} description={`${total}`} />

      <ViewControls
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t("crm.companies.searchPlaceholder")}
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
        addLabel={t("crm.companies.new")}
        featureLimitKey="companies"
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
          emptyMessage={search || activeFilters.length > 0 ? t("crm.companies.noMatching") : t("crm.companies.noYet")}
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
            </div>
          )}
        />
      )}

      {viewMode === "group_by" && (
        <GroupByView
          groups={groups}
          emptyMessage={t("crm.companies.noGroup")}
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
              <span className="text-xs text-muted-foreground">{c.size || "—"}</span>
            </div>
          )}
        />
      )}

      <EntityForm
        open={showForm}
        onOpenChange={setShowForm}
        title={t("crm.companies.new")}
        fields={companyFields}
        onSubmit={handleCreate}
      />

      <BulkActionBar
        selectedCount={selectedIds.size}
        onDeselectAll={() => setSelectedIds(new Set())}
        actions={[
          { label: t("common.delete"), variant: "destructive", onClick: () => setConfirmDelete(true) },
        ]}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t("crm.companies.deleteTitle")}
        description={t("crm.companies.deleteConfirm", { count: selectedIds.size })}
        confirmLabel={t("common.delete")}
        variant="destructive"
        isLoading={isBulkLoading}
        onConfirm={handleBulkDelete}
      />
    </PageContainer>
  );
}
