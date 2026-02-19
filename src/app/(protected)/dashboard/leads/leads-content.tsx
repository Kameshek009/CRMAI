"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { ViewControls, type FilterOption, type ActiveFilter, type SortOption, type GroupByOption } from "@/components/frappe/view-controls";
import { DataTable, type Column } from "@/components/frappe/data-table";
import { KanbanBoard, type KanbanColumn } from "@/components/frappe/kanban-board";
import { GroupByView, type GroupByGroup } from "@/components/frappe/group-by-view";
import { StatusBadge } from "@/components/frappe/status-badge";
import { EntityForm } from "@/components/crm/entity-form";
import { leadFields } from "@/lib/crm/field-definitions";
import { BulkActionBar } from "@/components/crm/bulk-action-bar";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Zap } from "lucide-react";
import { toast } from "sonner";
import type { ViewMode } from "@/types/crm";

// ============================================================================
// Types
// ============================================================================

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
  created_at: string;
}

// ============================================================================
// Constants
// ============================================================================

const FILTER_OPTIONS: FilterOption[] = [
  {
    field: "status", label: "Status", type: "select",
    options: [
      { value: "new", label: "New" },
      { value: "contacted", label: "Contacted" },
      { value: "qualified", label: "Qualified" },
      { value: "unqualified", label: "Unqualified" },
      { value: "junk", label: "Junk" },
    ],
  },
  {
    field: "source", label: "Source", type: "select",
    options: [
      { value: "website", label: "Website" },
      { value: "referral", label: "Referral" },
      { value: "campaign", label: "Campaign" },
      { value: "cold_call", label: "Cold Call" },
      { value: "social_media", label: "Social Media" },
      { value: "event", label: "Event" },
      { value: "other", label: "Other" },
    ],
  },
];

const SORT_OPTIONS: SortOption[] = [
  { field: "created_at", label: "Created" },
  { field: "first_name", label: "First Name" },
  { field: "last_name", label: "Last Name" },
  { field: "email", label: "Email" },
  { field: "source", label: "Source" },
  { field: "organization", label: "Organization" },
];

const GROUP_BY_OPTIONS: GroupByOption[] = [
  { field: "status", label: "Status" },
  { field: "source", label: "Source" },
];

const KANBAN_COLUMNS: KanbanColumn[] = [
  { id: "new", title: "New", color: "bg-blue-500" },
  { id: "contacted", title: "Contacted", color: "bg-amber-500" },
  { id: "qualified", title: "Qualified", color: "bg-emerald-500" },
  { id: "unqualified", title: "Unqualified", color: "bg-gray-500" },
  { id: "junk", title: "Junk", color: "bg-red-500" },
];

const PAGE_SIZE = 50;

// ============================================================================
// Component
// ============================================================================

export function LeadsContent() {
  const router = useRouter();

  const [leads, setLeads] = useState<LeadData[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [groupBy, setGroupBy] = useState<string | null>("status");

  const [showForm, setShowForm] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  const fetchLeads = useCallback(async () => {
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
      const res = await fetch(`/api/crm/leads?${params}`);
      const json = await res.json();
      if (json.success) {
        setLeads(json.data);
        setTotal(json.total || 0);
      }
    } finally {
      setIsLoading(false);
    }
  }, [search, sortBy, sortOrder, page, activeFilters]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);
  useEffect(() => { setSelectedIds(new Set()); }, [search, activeFilters]);
  useEffect(() => { setPage(1); }, [search, activeFilters, sortBy, sortOrder]);

  const handleCreate = async (values: Record<string, string>) => {
    const res = await fetch("/api/crm/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const json = await res.json();
    if (json.success) {
      toast.success("Lead created");
      fetchLeads();
    } else {
      toast.error(json.error || "Failed to create lead");
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

  const handleKanbanMove = async (itemId: string, toColumn: string) => {
    setLeads(prev => prev.map(l => l.id === itemId ? { ...l, status: toColumn } : l));
    const res = await fetch(`/api/crm/leads/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: toColumn }),
    });
    if (!res.ok) {
      toast.error("Failed to update status");
      fetchLeads();
    }
  };

  const handleBulkDelete = async () => {
    setIsBulkLoading(true);
    try {
      const ids = Array.from(selectedIds);
      const results = await Promise.all(
        ids.map(id => fetch(`/api/crm/leads/${id}`, { method: "DELETE" }).then(r => r.json()))
      );
      const successCount = results.filter(r => r.success).length;
      if (successCount > 0) {
        toast.success(`Deleted ${successCount} lead${successCount !== 1 ? "s" : ""}`);
        setSelectedIds(new Set());
        fetchLeads();
      } else {
        toast.error("Failed to delete leads");
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
        ids.map(id => fetch(`/api/crm/leads/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }).then(r => r.json()))
      );
      const successCount = results.filter(r => r.success).length;
      if (successCount > 0) {
        toast.success(`Updated ${successCount} lead${successCount !== 1 ? "s" : ""}`);
        setSelectedIds(new Set());
        fetchLeads();
      }
    } finally {
      setIsBulkLoading(false);
    }
  };

  const columns: Column<LeadData>[] = useMemo(() => [
    {
      key: "first_name", label: "Name", sortable: true,
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
    { key: "email", label: "Email", sortable: true },
    { key: "phone", label: "Phone" },
    { key: "organization", label: "Organization", sortable: true },
    { key: "source", label: "Source", sortable: true },
    {
      key: "status", label: "Status", sortable: true,
      render: (l) => <StatusBadge status={l.status} />,
    },
  ], []);

  const groups: GroupByGroup<LeadData>[] = useMemo(() => {
    if (!groupBy) return [];
    const map = new Map<string, LeadData[]>();
    for (const l of leads) {
      const key = String((l as unknown as Record<string, unknown>)[groupBy] ?? "—");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(l);
    }
    return Array.from(map.entries()).map(([key, items]) => ({
      key, label: key, count: items.length, items,
    }));
  }, [leads, groupBy]);

  const kanbanColumns: KanbanColumn[] = useMemo(() =>
    KANBAN_COLUMNS.map(col => ({
      ...col,
      count: leads.filter(l => l.status === col.id).length,
    })), [leads]);

  const kanbanItems = useMemo(() =>
    leads.map(l => ({ ...l, columnId: l.status })), [leads]);

  return (
    <PageContainer>
      <PageHeader title="Leads" description={`${total} lead${total !== 1 ? "s" : ""}`} />

      <ViewControls
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search leads..."
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
        entityName={`lead${total !== 1 ? "s" : ""}`}
        onAdd={() => setShowForm(true)}
        addLabel="New Lead"
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
          onRowClick={(l) => router.push(`/dashboard/leads/${l.id}`)}
          page={page}
          pageSize={PAGE_SIZE}
          totalCount={total}
          onPageChange={setPage}
          emptyMessage={search || activeFilters.length > 0 ? "No matching leads" : "No leads yet"}
        />
      )}

      {viewMode === "kanban" && !isLoading && (
        <KanbanBoard
          columns={kanbanColumns}
          cards={kanbanItems}
          onCardMove={(id, _from, to) => handleKanbanMove(id, to)}
          renderCard={(l) => (
            <div
              className="cursor-pointer"
              onClick={() => router.push(`/dashboard/leads/${l.id}`)}
            >
              <div className="flex items-center gap-2 mb-1">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px] bg-primary/10">
                    {(l.first_name[0] || "").toUpperCase()}{(l.last_name?.[0] || "").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium truncate">{l.first_name} {l.last_name || ""}</span>
              </div>
              {l.organization && <p className="text-xs text-muted-foreground truncate">{l.organization}</p>}
              {l.email && <p className="text-xs text-muted-foreground truncate">{l.email}</p>}
            </div>
          )}
        />
      )}

      {viewMode === "group_by" && (
        <GroupByView
          groups={groups}
          emptyMessage="No leads to group"
          renderItem={(l) => (
            <div
              key={l.id}
              className="flex items-center justify-between px-4 py-2 hover:bg-muted/30 cursor-pointer rounded-md transition-colors"
              onClick={() => router.push(`/dashboard/leads/${l.id}`)}
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-xs bg-primary/10">
                    {(l.first_name[0] || "").toUpperCase()}{(l.last_name?.[0] || "").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <span className="text-sm font-medium">{l.first_name} {l.last_name || ""}</span>
                  {l.organization && <p className="text-xs text-muted-foreground">{l.organization}</p>}
                </div>
              </div>
              <StatusBadge status={l.status} />
            </div>
          )}
        />
      )}

      <EntityForm
        open={showForm}
        onOpenChange={setShowForm}
        title="New Lead"
        fields={leadFields}
        onSubmit={handleCreate}
      />

      <BulkActionBar
        selectedCount={selectedIds.size}
        onDeselectAll={() => setSelectedIds(new Set())}
        actions={[
          {
            label: "Change Status",
            dropdown: [
              { label: "New", value: "new" },
              { label: "Contacted", value: "contacted" },
              { label: "Qualified", value: "qualified" },
              { label: "Unqualified", value: "unqualified" },
              { label: "Junk", value: "junk" },
            ],
            onDropdownSelect: handleBulkStatusChange,
          },
          {
            label: "Delete",
            variant: "destructive",
            onClick: () => setConfirmDelete(true),
          },
        ]}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete leads"
        description={`Are you sure you want to delete ${selectedIds.size} lead${selectedIds.size !== 1 ? "s" : ""}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        isLoading={isBulkLoading}
        onConfirm={handleBulkDelete}
      />
    </PageContainer>
  );
}
