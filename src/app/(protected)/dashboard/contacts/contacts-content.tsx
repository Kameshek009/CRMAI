"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { ViewControls, type FilterOption, type ActiveFilter, type SortOption, type GroupByOption } from "@/components/frappe/view-controls";
import { DataTable, type Column } from "@/components/frappe/data-table";
import { KanbanBoard, type KanbanColumn } from "@/components/frappe/kanban-board";
import { GroupByView, type GroupByGroup } from "@/components/frappe/group-by-view";
import { StatusBadge } from "@/components/frappe/status-badge";
import { EntityForm } from "@/components/crm/entity-form";
import { getContactFields } from "@/lib/crm/field-definitions";
import { ImportWizard } from "@/components/crm/import-wizard";
import { BulkActionBar } from "@/components/crm/bulk-action-bar";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { handleApiError } from "@/lib/crm/handle-api-error";
import { useFeatureLimitStore } from "@/stores/feature-limit-store";
import { useTranslation } from "@/lib/i18n";
import { QuickFilters } from "@/components/frappe/quick-filters";
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

const PAGE_SIZE = 50;

// ============================================================================
// Component
// ============================================================================

export function ContactsContent() {
  const router = useRouter();
  const { t } = useTranslation();

  const contactFields = useMemo(() => getContactFields(t), [t]);

  // Translated options
  const FILTER_OPTIONS: FilterOption[] = useMemo(() => [
    {
      field: "status", label: t("crm.contacts.fields.status"), type: "select",
      options: [
        { value: "lead", label: t("crm.contacts.statuses.lead") },
        { value: "active", label: t("crm.contacts.statuses.active") },
        { value: "inactive", label: t("crm.contacts.statuses.inactive") },
        { value: "churned", label: t("crm.contacts.statuses.churned") },
      ],
    },
  ], [t]);

  const SORT_OPTIONS: SortOption[] = useMemo(() => [
    { field: "created_at", label: t("crm.contacts.sort.created") },
    { field: "first_name", label: t("crm.contacts.sort.firstName") },
    { field: "last_name", label: t("crm.contacts.sort.lastName") },
    { field: "email", label: t("crm.contacts.sort.email") },
    { field: "engagement_score", label: t("crm.contacts.sort.engagement") },
  ], [t]);

  const GROUP_BY_OPTIONS: GroupByOption[] = useMemo(() => [
    { field: "status", label: t("crm.contacts.groupBy.status") },
    { field: "source", label: t("crm.contacts.groupBy.source") },
  ], [t]);

  const KANBAN_COLUMNS_BASE: KanbanColumn[] = useMemo(() => [
    { id: "lead", title: t("crm.contacts.statuses.lead"), color: "bg-indigo-500" },
    { id: "active", title: t("crm.contacts.statuses.active"), color: "bg-emerald-500" },
    { id: "inactive", title: t("crm.contacts.statuses.inactive"), color: "bg-gray-500" },
    { id: "churned", title: t("crm.contacts.statuses.churned"), color: "bg-red-500" },
  ], [t]);

  // Data
  const [contacts, setContacts] = useState<ContactData[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const pageRef = useRef(1);

  // View
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
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
  const fetchContacts = useCallback(async (pageNum: number, append: boolean) => {
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
      const res = await fetch(`/api/crm/contacts?${params}`);
      const json = await res.json();
      if (json.success) {
        if (append) {
          setContacts(prev => [...prev, ...json.data]);
        } else {
          setContacts(json.data);
        }
        setTotal(json.total || 0);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [search, sortBy, sortOrder, activeFilters]);

  useEffect(() => {
    pageRef.current = 1;
    fetchContacts(1, false);
  }, [fetchContacts]);
  useEffect(() => { setSelectedIds(new Set()); }, [search, activeFilters]);

  const handleLoadMore = useCallback(() => {
    if (isLoadingMore || contacts.length >= total) return;
    const nextPage = pageRef.current + 1;
    pageRef.current = nextPage;
    fetchContacts(nextPage, true);
  }, [isLoadingMore, contacts.length, total, fetchContacts]);

  // Handlers
  const handleCreate = async (values: Record<string, string>) => {
    const res = await fetch("/api/crm/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const json = await res.json();
    if (json.success) {
      toast.success(t("crm.contacts.created"));
      useFeatureLimitStore.getState().incrementUsage("contacts");
      pageRef.current = 1; fetchContacts(1, false);
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
      const res = await fetch("/api/crm/contacts/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", ids }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(t("crm.contacts.bulkDeleted", { count: ids.length }));
        setSelectedIds(new Set());
        pageRef.current = 1; fetchContacts(1, false);
      } else {
        toast.error(json.error || t("crm.contacts.bulkDeleteFailed"));
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
        toast.success(t("crm.contacts.bulkUpdated", { count: ids.length }));
        setSelectedIds(new Set());
        pageRef.current = 1; fetchContacts(1, false);
      } else {
        toast.error(json.error || t("crm.contacts.bulkUpdateFailed"));
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
      toast.error(t("crm.contacts.failedStatusUpdate"));
      pageRef.current = 1; fetchContacts(1, false);
    }
  };

  // Table columns
  const columns: Column<ContactData>[] = useMemo(() => [
    {
      key: "first_name", label: t("crm.contacts.fields.name"), sortable: true,
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
    { key: "email", label: t("crm.contacts.fields.email"), sortable: true },
    { key: "phone", label: t("crm.contacts.fields.phone") },
    {
      key: "companies", label: t("crm.contacts.fields.organization"),
      render: (c) => c.companies?.name || "\u2014",
    },
    {
      key: "status", label: t("crm.contacts.fields.status"), sortable: true,
      render: (c) => <StatusBadge status={c.status} />,
    },
    {
      key: "engagement_score", label: t("crm.contacts.fields.engagement"), sortable: true, align: "center",
      render: (c) => <span className="text-xs font-medium">{c.engagement_score || 0}</span>,
    },
  ], [t]);

  // Group by
  const groups: GroupByGroup<ContactData>[] = useMemo(() => {
    if (!groupBy) return [];
    const map = new Map<string, ContactData[]>();
    for (const c of contacts) {
      const key = String((c as unknown as Record<string, unknown>)[groupBy] ?? "\u2014");
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
    KANBAN_COLUMNS_BASE.map(col => ({
      ...col,
      count: contacts.filter(c => c.status === col.id).length,
    })), [contacts, KANBAN_COLUMNS_BASE]);

  const kanbanItems = useMemo(() =>
    contacts.map(c => ({ ...c, columnId: c.status })), [contacts]);

  return (
    <PageContainer>
      <PageHeader title={t("crm.contacts.title")} description={`${total}`}>
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
        searchPlaceholder={t("crm.contacts.searchPlaceholder")}
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
        addLabel={t("crm.contacts.new")}
        featureLimitKey="contacts"
      />

      <QuickFilters
        options={FILTER_OPTIONS[0].options?.map(o => ({
          value: o.value,
          label: o.label,
          count: contacts.filter(c => c.status === o.value).length,
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
          totalCount={total}
          onLoadMore={handleLoadMore}
          isLoadingMore={isLoadingMore}
          hasMore={contacts.length < total}
          emptyMessage={search || activeFilters.length > 0 ? t("crm.contacts.noMatching") : t("crm.contacts.noYet")}
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
          emptyMessage={t("crm.contacts.noGroup")}
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
        title={t("crm.contacts.new")}
        fields={contactFields}
        onSubmit={handleCreate}
      />

      <ImportWizard
        open={showImport}
        onOpenChange={setShowImport}
        onComplete={() => { pageRef.current = 1; fetchContacts(1, false); }}
      />

      <BulkActionBar
        selectedCount={selectedIds.size}
        onDeselectAll={() => setSelectedIds(new Set())}
        actions={[
          {
            label: t("crm.contacts.changeStatus"),
            dropdown: [
              { label: t("crm.contacts.statuses.lead"), value: "lead" },
              { label: t("crm.contacts.statuses.active"), value: "active" },
              { label: t("crm.contacts.statuses.inactive"), value: "inactive" },
              { label: t("crm.contacts.statuses.churned"), value: "churned" },
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
        title={t("crm.contacts.deleteTitle")}
        description={t("crm.contacts.deleteConfirm", { count: selectedIds.size })}
        confirmLabel={t("common.delete")}
        variant="destructive"
        isLoading={isBulkLoading}
        onConfirm={handleBulkDelete}
      />
    </PageContainer>
  );
}
