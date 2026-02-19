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
import { contactFields } from "@/lib/crm/field-definitions";
import { ImportWizard } from "@/components/crm/import-wizard";
import { BulkActionBar } from "@/components/crm/bulk-action-bar";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Upload, Users } from "lucide-react";
import { toast } from "sonner";
import { handleApiError } from "@/lib/crm/handle-api-error";
import { useFeatureLimitStore } from "@/stores/feature-limit-store";
import type { ViewMode } from "@/types/crm";

// ============================================================================
// Types
// ============================================================================

interface ContactData {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  title: string | null;
  status: string;
  source: string | null;
  engagement_score: number;
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
      { value: "lead", label: "Lead" },
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
      { value: "churned", label: "Churned" },
    ],
  },
];

const SORT_OPTIONS: SortOption[] = [
  { field: "created_at", label: "Created" },
  { field: "first_name", label: "First Name" },
  { field: "last_name", label: "Last Name" },
  { field: "email", label: "Email" },
  { field: "engagement_score", label: "Engagement" },
];

const GROUP_BY_OPTIONS: GroupByOption[] = [
  { field: "status", label: "Status" },
  { field: "source", label: "Source" },
];

const KANBAN_COLUMNS: KanbanColumn[] = [
  { id: "lead", title: "Lead", color: "bg-indigo-500" },
  { id: "active", title: "Active", color: "bg-emerald-500" },
  { id: "inactive", title: "Inactive", color: "bg-gray-500" },
  { id: "churned", title: "Churned", color: "bg-red-500" },
];

const PAGE_SIZE = 50;

// ============================================================================
// Component
// ============================================================================

export function ContactsContent() {
  const router = useRouter();

  // Data
  const [contacts, setContacts] = useState<ContactData[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // View
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [groupBy, setGroupBy] = useState<string | null>("status");

  // Forms
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);

  // Bulk
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  // Fetch
  const fetchContacts = useCallback(async () => {
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
      const res = await fetch(`/api/crm/contacts?${params}`);
      const json = await res.json();
      if (json.success) {
        setContacts(json.data);
        setTotal(json.total || 0);
      }
    } finally {
      setIsLoading(false);
    }
  }, [search, sortBy, sortOrder, page, activeFilters]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);
  useEffect(() => { setSelectedIds(new Set()); }, [search, activeFilters]);
  useEffect(() => { setPage(1); }, [search, activeFilters, sortBy, sortOrder]);

  // Handlers
  const handleCreate = async (values: Record<string, string>) => {
    const res = await fetch("/api/crm/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const json = await res.json();
    if (json.success) {
      toast.success("Contact created");
      useFeatureLimitStore.getState().incrementUsage("contacts");
      fetchContacts();
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
      const res = await fetch("/api/crm/contacts/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", ids }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Deleted ${ids.length} contact${ids.length !== 1 ? "s" : ""}`);
        setSelectedIds(new Set());
        fetchContacts();
      } else {
        toast.error(json.error || "Failed to delete contacts");
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
      const res = await fetch("/api/crm/contacts/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_status", ids, status }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Updated ${ids.length} contact${ids.length !== 1 ? "s" : ""}`);
        setSelectedIds(new Set());
        fetchContacts();
      } else {
        toast.error(json.error || "Failed to update contacts");
      }
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleKanbanMove = async (itemId: string, toColumn: string) => {
    setContacts(prev => prev.map(c => c.id === itemId ? { ...c, status: toColumn } : c));
    const res = await fetch(`/api/crm/contacts/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: toColumn }),
    });
    if (!res.ok) {
      toast.error("Failed to update status");
      fetchContacts();
    }
  };

  // Table columns
  const columns: Column<ContactData>[] = useMemo(() => [
    {
      key: "first_name", label: "Name", sortable: true,
      render: (c) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-xs bg-primary/10">
              {(c.first_name[0] || "").toUpperCase()}{(c.last_name?.[0] || "").toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <span className="font-medium">{c.first_name} {c.last_name || ""}</span>
            {c.title && <p className="text-xs text-muted-foreground">{c.title}</p>}
          </div>
        </div>
      ),
    },
    { key: "email", label: "Email", sortable: true },
    { key: "phone", label: "Phone" },
    {
      key: "companies", label: "Organization",
      render: (c) => c.companies?.name || "—",
    },
    {
      key: "status", label: "Status", sortable: true,
      render: (c) => <StatusBadge status={c.status} />,
    },
    {
      key: "engagement_score", label: "Engagement", sortable: true, align: "center",
      render: (c) => <span className="text-xs font-medium">{c.engagement_score || 0}</span>,
    },
  ], []);

  // Group by
  const groups: GroupByGroup<ContactData>[] = useMemo(() => {
    if (!groupBy) return [];
    const map = new Map<string, ContactData[]>();
    for (const c of contacts) {
      const key = String((c as unknown as Record<string, unknown>)[groupBy] ?? "—");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return Array.from(map.entries()).map(([key, items]) => ({
      key,
      label: key,
      count: items.length,
      items,
    }));
  }, [contacts, groupBy]);

  // Kanban data
  const kanbanColumns: KanbanColumn[] = useMemo(() =>
    KANBAN_COLUMNS.map(col => ({
      ...col,
      count: contacts.filter(c => c.status === col.id).length,
    })), [contacts]);

  const kanbanItems = useMemo(() =>
    contacts.map(c => ({ ...c, columnId: c.status })), [contacts]);

  return (
    <PageContainer>
      <PageHeader title="Contacts" description={`${total} contact${total !== 1 ? "s" : ""}`}>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
            <Upload className="size-4 mr-1" />
            Import
          </Button>
        </div>
      </PageHeader>

      <ViewControls
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search contacts..."
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
        entityName={`contact${total !== 1 ? "s" : ""}`}
        onAdd={() => setShowForm(true)}
        addLabel="New Contact"
        featureLimitKey="contacts"
      />

      {/* Table View */}
      {viewMode === "table" && (
        <DataTable
          columns={columns}
          data={contacts}
          loading={isLoading}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSortChange}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onRowClick={(c) => router.push(`/dashboard/contacts/${c.id}`)}
          page={page}
          pageSize={PAGE_SIZE}
          totalCount={total}
          onPageChange={setPage}
          emptyMessage={search || activeFilters.length > 0 ? "No matching contacts" : "No contacts yet"}
        />
      )}

      {/* Kanban View */}
      {viewMode === "kanban" && !isLoading && (
        <KanbanBoard
          columns={kanbanColumns}
          cards={kanbanItems}
          onCardMove={(id, _from, to) => handleKanbanMove(id, to)}
          renderCard={(c) => (
            <div
              className="cursor-pointer"
              onClick={() => router.push(`/dashboard/contacts/${c.id}`)}
            >
              <div className="flex items-center gap-2 mb-1">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px] bg-primary/10">
                    {(c.first_name[0] || "").toUpperCase()}{(c.last_name?.[0] || "").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium truncate">{c.first_name} {c.last_name || ""}</span>
              </div>
              {c.email && <p className="text-xs text-muted-foreground truncate">{c.email}</p>}
              {c.companies?.name && <p className="text-xs text-muted-foreground truncate">{c.companies.name}</p>}
            </div>
          )}
        />
      )}

      {/* Group By View */}
      {viewMode === "group_by" && (
        <GroupByView
          groups={groups}
          emptyMessage="No contacts to group"
          renderItem={(c) => (
            <div
              key={c.id}
              className="flex items-center justify-between px-4 py-2 hover:bg-muted/30 cursor-pointer rounded-md transition-colors"
              onClick={() => router.push(`/dashboard/contacts/${c.id}`)}
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-xs bg-primary/10">
                    {(c.first_name[0] || "").toUpperCase()}{(c.last_name?.[0] || "").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <span className="text-sm font-medium">{c.first_name} {c.last_name || ""}</span>
                  {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={c.status} />
              </div>
            </div>
          )}
        />
      )}

      <EntityForm
        open={showForm}
        onOpenChange={setShowForm}
        title="New Contact"
        fields={contactFields}
        onSubmit={handleCreate}
      />

      <ImportWizard
        open={showImport}
        onOpenChange={setShowImport}
        onComplete={fetchContacts}
      />

      <BulkActionBar
        selectedCount={selectedIds.size}
        onDeselectAll={() => setSelectedIds(new Set())}
        actions={[
          {
            label: "Change Status",
            dropdown: [
              { label: "Lead", value: "lead" },
              { label: "Active", value: "active" },
              { label: "Inactive", value: "inactive" },
              { label: "Churned", value: "churned" },
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
        title="Delete contacts"
        description={`Are you sure you want to delete ${selectedIds.size} contact${selectedIds.size !== 1 ? "s" : ""}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        isLoading={isBulkLoading}
        onConfirm={handleBulkDelete}
      />
    </PageContainer>
  );
}
