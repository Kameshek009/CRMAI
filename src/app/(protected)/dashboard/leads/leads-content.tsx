"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { ViewControls, type FilterOption, type ActiveFilter, type SortOption } from "@/components/frappe/view-controls";
import { DataTable, type Column } from "@/components/frappe/data-table";
import { StatusBadge } from "@/components/frappe/status-badge";
import { EntityForm, type FormField } from "@/components/crm/entity-form";
import { BulkActionBar } from "@/components/crm/bulk-action-bar";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { handleApiError } from "@/lib/crm/handle-api-error";
import { useTranslation } from "@/lib/i18n";
import { TimeAgo } from "@/components/ui/time-ago";
import { QuickFilters } from "@/components/frappe/quick-filters";
import { useWorkspace } from "@/contexts/team-context";
import { useRealtimeTable } from "@/lib/realtime/use-realtime-table";
import { ImportWizard } from "@/components/crm/import-wizard";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import type { ViewMode } from "@/types/crm";

interface LeadData {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  organization: string | null;
  job_title: string | null;
  source: string | null;
  status: string;
  converted_at: string | null;
  created_at: string;
  score: number;
}

const PAGE_SIZE = 50;

export function LeadsContent() {
  const router = useRouter();
  const { t } = useTranslation();

  const leadFields: FormField[] = useMemo(() => [
    { name: "first_name", label: t("crm.leads.fields.firstName"), type: "text" as const, required: true },
    { name: "last_name", label: t("crm.leads.fields.lastName"), type: "text" as const },
    { name: "email", label: t("crm.leads.fields.email"), type: "text" as const },
    { name: "phone", label: t("crm.leads.fields.phone"), type: "text" as const },
    { name: "organization", label: t("crm.leads.fields.organization"), type: "text" as const },
    { name: "job_title", label: t("crm.leads.fields.jobTitle"), type: "text" as const },
    { name: "source", label: t("crm.leads.fields.source"), type: "text" as const },
  ], [t]);

  const FILTER_OPTIONS: FilterOption[] = useMemo(() => [
    {
      field: "status", label: t("crm.leads.fields.status"), type: "select" as const,
      options: [
        { value: "new", label: t("crm.leads.statuses.new") },
        { value: "contacted", label: t("crm.leads.statuses.contacted") },
        { value: "qualified", label: t("crm.leads.statuses.qualified") },
        { value: "unqualified", label: t("crm.leads.statuses.unqualified") },
        { value: "junk", label: t("crm.leads.statuses.junk") },
      ],
    },
  ], [t]);

  const SORT_OPTIONS: SortOption[] = useMemo(() => [
    { field: "created_at", label: t("crm.leads.sort.created") },
    { field: "first_name", label: t("crm.leads.sort.firstName") },
    { field: "email", label: t("crm.leads.sort.email") },
    { field: "organization", label: t("crm.leads.sort.organization") },
    { field: "score", label: t("crm.leads.fields.score") },
  ], [t]);

  const [leads, setLeads] = useState<LeadData[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const pageRef = useRef(1);

  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const fetchLeads = useCallback(async (pageNum: number, append: boolean, signal?: AbortSignal) => {
    if (append) setIsLoadingMore(true);
    else setIsLoading(true);
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
      const res = await fetch(`/api/crm/leads?${params}`, { signal });
      const json = await res.json();
      if (json.success) {
        if (append) setLeads((prev) => [...prev, ...json.data]);
        else setLeads(json.data);
        setTotal(json.total || 0);
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
    fetchLeads(1, false, abortRef.current.signal);
    return () => { abortRef.current?.abort(); };
  }, [fetchLeads]);
  useEffect(() => { setSelectedIds(new Set()); }, [search, activeFilters]);

  const { currentWorkspace } = useWorkspace();
  useRealtimeTable({
    table: "leads",
    filterValue: currentWorkspace?.id,
    onChange: () => fetchLeads(1, false),
  });

  const handleLoadMore = useCallback(() => {
    if (isLoadingMore || leads.length >= total) return;
    const nextPage = pageRef.current + 1;
    pageRef.current = nextPage;
    fetchLeads(nextPage, true);
  }, [isLoadingMore, leads.length, total, fetchLeads]);

  const handleCreate = async (values: Record<string, string>) => {
    const res = await fetch("/api/crm/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(Object.entries(values).filter(([, v]) => v !== ""))),
    });
    const json = await res.json();
    if (json.success) {
      toast.success(t("crm.leads.created"));
      pageRef.current = 1;
      fetchLeads(1, false);
    } else {
      handleApiError(json);
      throw new Error(json.error);
    }
  };

  const handleFilterAdd = useCallback((field: string, value: string) => {
    const option = FILTER_OPTIONS.find((f) => f.field === field);
    const optLabel = option?.options?.find((o) => o.value === value)?.label || value;
    setActiveFilters((prev) => [...prev.filter((f) => f.field !== field), { field, value, label: optLabel }]);
  }, [FILTER_OPTIONS]);

  const handleFilterRemove = useCallback((field: string) => {
    setActiveFilters((prev) => prev.filter((f) => f.field !== field));
  }, []);

  const handleSortChange = useCallback((field: string, order: "asc" | "desc") => {
    setSortBy(field);
    setSortOrder(order);
  }, []);

  const handleRowClick = useCallback((l: { id: string }) => {
    router.push(`/dashboard/leads/${l.id}`);
  }, [router]);

  const handleBulkDelete = async () => {
    setIsBulkLoading(true);
    try {
      const ids = Array.from(selectedIds);
      const results = await Promise.all(
        ids.map((id) => fetch(`/api/crm/leads/${id}`, { method: "DELETE" }))
      );
      const allOk = results.every((r) => r.ok);
      if (allOk) {
        toast.success(t("crm.leads.deleted", { count: ids.length }));
        setSelectedIds(new Set());
        pageRef.current = 1;
        fetchLeads(1, false);
      } else {
        toast.error(t("crm.leads.deleteFailed"));
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
      const results = await Promise.all(
        ids.map((id) =>
          fetch(`/api/crm/leads/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          })
        )
      );
      const allOk = results.every((r) => r.ok);
      if (allOk) {
        toast.success(t("crm.leads.statusUpdated", { count: ids.length }));
      } else {
        toast.error(t("crm.leads.statusUpdateFailed"));
      }
      setSelectedIds(new Set());
      pageRef.current = 1;
      fetchLeads(1, false);
    } finally {
      setIsBulkLoading(false);
    }
  };

  const columns: Column<LeadData>[] = useMemo(() => [
    {
      key: "first_name",
      label: t("crm.leads.fields.name"),
      sortable: true,
      render: (l) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-xs bg-primary/10">
              {(l.first_name[0] || "").toUpperCase()}{(l.last_name?.[0] || "").toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <span className="font-medium">{l.first_name} {l.last_name || ""}</span>
            {l.job_title && <p className="text-xs text-muted-foreground">{l.job_title}</p>}
          </div>
        </div>
      ),
    },
    { key: "email", label: t("crm.leads.fields.email"), sortable: true },
    { key: "phone", label: t("crm.leads.fields.phone") },
    {
      key: "organization",
      label: t("crm.leads.fields.organization"),
      sortable: true,
      render: (l) => l.organization || "\u2014",
    },
    {
      key: "status",
      label: t("crm.leads.fields.status"),
      sortable: true,
      render: (l) => <StatusBadge status={l.status} />,
    },
    {
      key: "source",
      label: t("crm.leads.fields.source"),
      render: (l) => l.source || "\u2014",
    },
    {
      key: "score",
      label: t("crm.leads.fields.score"),
      sortable: true,
      render: (l) => {
        if (!l.score) return <span className="text-muted-foreground">\u2014</span>;
        const tone =
          l.score >= 70 ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
          : l.score >= 40 ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
          : "bg-muted text-muted-foreground";
        return (
          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${tone}`}>
            {l.score}
          </span>
        );
      },
    },
    {
      key: "converted_at",
      label: t("crm.leads.fields.converted"),
      render: (l) =>
        l.converted_at
          ? <TimeAgo date={l.converted_at} className="text-sm" />
          : "\u2014",
    },
  ], [t]);

  return (
    <PageContainer>
      <PageHeader title={t("crm.leads.title")} description={`${total}`}>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
            <Upload className="size-4 mr-1" />
            {t("crm.viewControls.import")}
          </Button>
        </div>
      </PageHeader>

      <ViewControls
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t("crm.leads.searchPlaceholder")}
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
        totalCount={total}
        onAdd={() => setShowForm(true)}
        addLabel={t("crm.leads.new")}
      />

      <QuickFilters
        options={FILTER_OPTIONS[0]?.options?.map(o => ({
          value: o.value,
          label: o.label,
          count: leads.filter(l => l.status === o.value).length,
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
          data={leads}
          loading={isLoading}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSortChange}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onRowClick={handleRowClick}
          totalCount={total}
          onLoadMore={handleLoadMore}
          isLoadingMore={isLoadingMore}
          hasMore={leads.length < total}
          emptyMessage={search || activeFilters.length > 0 ? t("crm.leads.noMatching") : t("crm.leads.noYet")}
        />
      )}

      <EntityForm
        open={showForm}
        onOpenChange={setShowForm}
        title={t("crm.leads.new")}
        fields={leadFields}
        onSubmit={handleCreate}
      />

      <BulkActionBar
        selectedCount={selectedIds.size}
        onDeselectAll={() => setSelectedIds(new Set())}
        actions={[
          {
            label: t("crm.leads.changeStatus"),
            dropdown: [
              { label: t("crm.leads.statuses.new"), value: "new" },
              { label: t("crm.leads.statuses.contacted"), value: "contacted" },
              { label: t("crm.leads.statuses.qualified"), value: "qualified" },
              { label: t("crm.leads.statuses.unqualified"), value: "unqualified" },
              { label: t("crm.leads.statuses.junk"), value: "junk" },
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
        title={t("crm.leads.deleteTitle")}
        description={t("crm.leads.deleteConfirm", { count: selectedIds.size })}
        confirmLabel={t("common.delete")}
        variant="destructive"
        isLoading={isBulkLoading}
        onConfirm={handleBulkDelete}
      />

      <ImportWizard
        entity="leads"
        open={showImport}
        onOpenChange={setShowImport}
        onComplete={() => { pageRef.current = 1; fetchLeads(1, false); }}
      />
    </PageContainer>
  );
}
