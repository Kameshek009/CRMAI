"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { ViewControls, type FilterOption, type ActiveFilter, type SortOption } from "@/components/frappe/view-controls";
import { DataTable, type Column } from "@/components/frappe/data-table";
import { StatusBadge } from "@/components/frappe/status-badge";
import { EntityForm } from "@/components/crm/entity-form";
import { callLogFields } from "@/lib/crm/field-definitions";
import { Badge } from "@/components/ui/badge";
import { PhoneIncoming, PhoneOutgoing } from "lucide-react";
import { toast } from "sonner";
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
  leads: { id: string; first_name: string; last_name: string | null } | null;
}

// ============================================================================
// Constants
// ============================================================================

const FILTER_OPTIONS: FilterOption[] = [
  {
    field: "status", label: "Status", type: "select",
    options: [
      { value: "completed", label: "Completed" },
      { value: "missed", label: "Missed" },
      { value: "no_answer", label: "No Answer" },
      { value: "busy", label: "Busy" },
      { value: "voicemail", label: "Voicemail" },
      { value: "cancelled", label: "Cancelled" },
    ],
  },
  {
    field: "direction", label: "Direction", type: "select",
    options: [
      { value: "inbound", label: "Inbound" },
      { value: "outbound", label: "Outbound" },
    ],
  },
];

const SORT_OPTIONS: SortOption[] = [
  { field: "created_at", label: "Created" },
  { field: "duration_seconds", label: "Duration" },
  { field: "status", label: "Status" },
  { field: "direction", label: "Direction" },
];

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
      toast.success("Call log created");
      fetchCallLogs();
    } else {
      toast.error(json.error || "Failed to create call log");
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

  const columns: Column<CallLogData>[] = useMemo(() => [
    {
      key: "direction", label: "Direction",
      render: (c) => (
        <div className="flex items-center gap-2">
          {c.direction === "inbound"
            ? <PhoneIncoming className="h-4 w-4 text-emerald-500" />
            : <PhoneOutgoing className="h-4 w-4 text-blue-500" />
          }
          <span className="text-sm capitalize">{c.direction}</span>
        </div>
      ),
    },
    {
      key: "contacts", label: "Contact / Lead",
      render: (c) => {
        if (c.contacts) return `${c.contacts.first_name} ${c.contacts.last_name || ""}`.trim();
        if (c.leads) return `${c.leads.first_name} ${c.leads.last_name || ""}`.trim();
        return "—";
      },
    },
    { key: "from_number", label: "From" },
    { key: "to_number", label: "To" },
    {
      key: "duration_seconds", label: "Duration", sortable: true, align: "center",
      render: (c) => <span className="text-sm">{formatDuration(c.duration_seconds)}</span>,
    },
    {
      key: "status", label: "Status", sortable: true,
      render: (c) => <StatusBadge status={c.status} />,
    },
    {
      key: "summary", label: "Summary",
      render: (c) => c.summary ? (
        <span className="text-xs text-muted-foreground line-clamp-1">{c.summary}</span>
      ) : "—",
    },
    {
      key: "created_at", label: "Date", sortable: true,
      render: (c) => new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    },
  ], []);

  return (
    <PageContainer>
      <PageHeader title="Call Logs" description={`${total} call log${total !== 1 ? "s" : ""}`} />

      <ViewControls
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search call logs..."
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
        entityName={`call log${total !== 1 ? "s" : ""}`}
        onAdd={() => setShowForm(true)}
        addLabel="New Call Log"
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
        emptyMessage={search || activeFilters.length > 0 ? "No matching call logs" : "No call logs yet"}
      />

      <EntityForm
        open={showForm}
        onOpenChange={setShowForm}
        title="New Call Log"
        fields={callLogFields}
        onSubmit={handleCreate}
      />
    </PageContainer>
  );
}
