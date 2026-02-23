"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { ViewControls, type FilterOption, type ActiveFilter, type SortOption } from "@/components/frappe/view-controls";
import { DataTable, type Column } from "@/components/frappe/data-table";
import { StatusBadge } from "@/components/frappe/status-badge";
import { EntityForm } from "@/components/crm/entity-form";
import { getCallLogFields } from "@/lib/crm/field-definitions";
import { PhoneIncoming, PhoneOutgoing } from "lucide-react";
import { TimeAgo } from "@/components/ui/time-ago";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";
import type { ViewMode } from "@/types/crm";

// ============================================================================
// Types
// ============================================================================

interface CallLogData {
  id: string;
  direction: string;
  status: string;
  from_number: string | null;
  to_number: string | null;
  duration_seconds: number | null;
  summary: string | null;
  created_at: string;
  contacts: { id: string; first_name: string; last_name: string | null } | null;
}

const PAGE_SIZE = 50;

function formatDuration(seconds: number | null): string {
  if (seconds == null || seconds === 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// ============================================================================
// Component
// ============================================================================

export function CallLogsContent() {
  const { t } = useTranslation();
  const [callLogs, setCallLogs] = useState<CallLogData[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);

  const [showForm, setShowForm] = useState(false);

  const filterOptions: FilterOption[] = useMemo(() => [
    {
      field: "status", label: t("crm.callLogs.fields.status"), type: "select",
      options: [
        { value: "completed", label: t("crm.callLogs.statuses.completed") },
        { value: "missed", label: t("crm.callLogs.statuses.missed") },
        { value: "no_answer", label: t("crm.callLogs.statuses.noAnswer") },
        { value: "busy", label: t("crm.callLogs.statuses.busy") },
        { value: "voicemail", label: t("crm.callLogs.statuses.voicemail") },
        { value: "cancelled", label: t("crm.callLogs.statuses.cancelled") },
      ],
    },
    {
      field: "direction", label: t("crm.callLogs.fields.direction"), type: "select",
      options: [
        { value: "inbound", label: t("crm.callLogs.directions.inbound") },
        { value: "outbound", label: t("crm.callLogs.directions.outbound") },
      ],
    },
  ], [t]);

  const sortOptions: SortOption[] = useMemo(() => [
    { field: "created_at", label: t("crm.callLogs.sort.created") },
    { field: "duration_seconds", label: t("crm.callLogs.sort.duration") },
    { field: "status", label: t("crm.callLogs.sort.status") },
    { field: "direction", label: t("crm.callLogs.sort.direction") },
  ], [t]);

  const fetchCallLogs = useCallback(async () => {
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
      const res = await fetch(`/api/crm/call-logs?${params}`);
      const json = await res.json();
      if (json.success) {
        setCallLogs(json.data);
        setTotal(json.total || 0);
      }
    } finally {
      setIsLoading(false);
    }
  }, [search, sortBy, sortOrder, page, activeFilters]);

  useEffect(() => { fetchCallLogs(); }, [fetchCallLogs]);
  useEffect(() => { setPage(1); }, [search, activeFilters, sortBy, sortOrder]);

  const handleCreate = async (values: Record<string, string>) => {
    const payload: Record<string, unknown> = { ...values };
    if (values.duration_seconds) payload.duration_seconds = Number(values.duration_seconds);
    const res = await fetch("/api/crm/call-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (json.success) {
      toast.success(t("crm.callLogs.created"));
      fetchCallLogs();
    } else {
      toast.error(json.error || t("crm.callLogs.created"));
      throw new Error(json.error);
    }
  };

  const handleFilterAdd = useCallback((field: string, value: string) => {
    const option = filterOptions.find(f => f.field === field);
    const optLabel = option?.options?.find(o => o.value === value)?.label || value;
    setActiveFilters(prev => {
      const next = prev.filter(f => f.field !== field);
      return [...next, { field, value, label: optLabel }];
    });
  }, [filterOptions]);

  const handleFilterRemove = useCallback((field: string) => {
    setActiveFilters(prev => prev.filter(f => f.field !== field));
  }, []);

  const handleSortChange = useCallback((field: string, order: "asc" | "desc") => {
    setSortBy(field);
    setSortOrder(order);
  }, []);

  const columns: Column<CallLogData>[] = useMemo(() => [
    {
      key: "direction", label: t("crm.callLogs.fields.direction"),
      render: (c) => (
        <div className="flex items-center gap-2">
          {c.direction === "inbound"
            ? <PhoneIncoming className="h-4 w-4 text-emerald-500" />
            : <PhoneOutgoing className="h-4 w-4 text-blue-500" />
          }
          <span className="text-sm">
            {c.direction === "inbound" ? t("crm.callLogs.directions.inbound") : t("crm.callLogs.directions.outbound")}
          </span>
        </div>
      ),
    },
    {
      key: "contacts", label: t("crm.callLogs.fields.contact"),
      render: (c) => {
        if (c.contacts) return `${c.contacts.first_name} ${c.contacts.last_name || ""}`.trim();
        return "—";
      },
    },
    { key: "from_number", label: t("crm.callLogs.fields.from") },
    { key: "to_number", label: t("crm.callLogs.fields.to") },
    {
      key: "duration_seconds", label: t("crm.callLogs.sort.duration"), sortable: true, align: "center",
      render: (c) => <span className="text-sm">{formatDuration(c.duration_seconds)}</span>,
    },
    {
      key: "status", label: t("crm.callLogs.fields.status"), sortable: true,
      render: (c) => <StatusBadge status={c.status} />,
    },
    {
      key: "summary", label: t("crm.callLogs.fields.summary"),
      render: (c) => c.summary ? (
        <span className="text-xs text-muted-foreground line-clamp-1">{c.summary}</span>
      ) : "—",
    },
    {
      key: "created_at", label: t("crm.callLogs.fields.date"), sortable: true,
      render: (c) => <TimeAgo date={c.created_at} className="text-sm" />,
    },
  ], [t]);

  const description = total === 1
    ? t("crm.callLogs.countOne", { count: total })
    : t("crm.callLogs.count", { count: total });

  return (
    <PageContainer>
      <PageHeader title={t("crm.callLogs.title")} description={description} />

      <ViewControls
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t("crm.callLogs.searchPlaceholder")}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        filterOptions={filterOptions}
        activeFilters={activeFilters}
        onFilterAdd={handleFilterAdd}
        onFilterRemove={handleFilterRemove}
        onFiltersClear={() => setActiveFilters([])}
        sortOptions={sortOptions}
        currentSort={sortBy}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
        totalCount={total}
        entityName={t("crm.callLogs.title").toLowerCase()}
        onAdd={() => setShowForm(true)}
        addLabel={t("crm.callLogs.new")}
      />

      <DataTable
        columns={columns}
        data={callLogs}
        loading={isLoading}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSortChange}
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={total}
        onPageChange={setPage}
        emptyMessage={search || activeFilters.length > 0 ? t("crm.callLogs.noMatching") : t("crm.callLogs.noYet")}
      />

      <EntityForm
        open={showForm}
        onOpenChange={setShowForm}
        title={t("crm.callLogs.new")}
        fields={getCallLogFields(t)}
        onSubmit={handleCreate}
      />
    </PageContainer>
  );
}
