"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { ViewControls, type FilterOption, type ActiveFilter, type SortOption } from "@/components/frappe/view-controls";
import { DataTable, type Column } from "@/components/frappe/data-table";
import { StatusBadge } from "@/components/frappe/status-badge";
import { ShowingsCalendar } from "@/components/crm/showings-calendar";
import { BulkActionBar, type BulkAction } from "@/components/crm/bulk-action-bar";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Table2, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { handleApiError } from "@/lib/crm/handle-api-error";
import { useTranslation } from "@/lib/i18n";
import { startOfMonth, endOfMonth, format } from "date-fns";
import type { ViewMode, ShowingRow } from "@/types/crm";

// ============================================================================
// Types
// ============================================================================

type FormMode = { type: "closed" } | { type: "create" } | { type: "edit"; showing: ShowingRow };

const selectClass = "flex h-9 w-full rounded-md border border-input bg-transparent px-4 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

const PAGE_SIZE = 50;

// ============================================================================
// Component
// ============================================================================

export function ShowingsContent() {
  const { t, locale } = useTranslation();
  const [showings, setShowings] = useState<ShowingRow[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const pageRef = useRef(1);

  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [displayMode, setDisplayMode] = useState<"table" | "calendar">("table");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("showing_date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const [formMode, setFormMode] = useState<FormMode>({ type: "closed" });
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Contacts/deals for selects
  const [contacts, setContacts] = useState<{ id: string; first_name: string; last_name: string | null }[]>([]);
  const [deals, setDeals] = useState<{ id: string; title: string }[]>([]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  // ============================================================================
  // Config
  // ============================================================================

  const filterOptions: FilterOption[] = useMemo(() => [
    {
      field: "status", label: t("crm.showings.fields.status"), type: "select",
      options: [
        { value: "scheduled", label: t("crm.showings.statuses.scheduled") },
        { value: "completed", label: t("crm.showings.statuses.completed") },
        { value: "cancelled", label: t("crm.showings.statuses.cancelled") },
        { value: "no_show", label: t("crm.showings.statuses.no_show") },
      ],
    },
  ], [t]);

  const sortOptions: SortOption[] = useMemo(() => [
    { field: "showing_date", label: t("crm.showings.fields.showingDate") },
    { field: "created_at", label: t("crm.tasks.sort.created") },
    { field: "title", label: t("crm.showings.fields.title") },
    { field: "status", label: t("crm.showings.fields.status") },
    { field: "address", label: t("crm.showings.fields.address") },
  ], [t]);

  // ============================================================================
  // Data fetching
  // ============================================================================

  const fetchShowings = useCallback(async (pageNum: number, append: boolean) => {
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
      // For calendar view, add date range
      if (displayMode === "calendar") {
        const monthStart = startOfMonth(calendarMonth);
        const monthEnd = endOfMonth(calendarMonth);
        // Expand range to cover the full calendar grid (± 1 week)
        const from = new Date(monthStart);
        from.setDate(from.getDate() - 7);
        const to = new Date(monthEnd);
        to.setDate(to.getDate() + 7);
        params.set("from", from.toISOString());
        params.set("to", to.toISOString());
        params.set("limit", "200");
      }
      const res = await fetch(`/api/crm/showings?${params}`);
      const json = await res.json();
      if (json.success) {
        if (append) {
          setShowings(prev => [...prev, ...json.data]);
        } else {
          setShowings(json.data);
        }
        setTotal(json.total || 0);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [search, sortBy, sortOrder, activeFilters, displayMode, calendarMonth]);

  useEffect(() => {
    pageRef.current = 1;
    fetchShowings(1, false);
  }, [fetchShowings]);

  useEffect(() => { setSelectedIds(new Set()); }, [search, activeFilters]);

  const handleLoadMore = useCallback(() => {
    if (isLoadingMore || showings.length >= total) return;
    const nextPage = pageRef.current + 1;
    pageRef.current = nextPage;
    fetchShowings(nextPage, true);
  }, [isLoadingMore, showings.length, total, fetchShowings]);

  const handleRowClick = useCallback((row: ShowingRow) => {
    setFormMode({ type: "edit", showing: row });
  }, []);

  // Load contacts and deals for form selects
  const loadFormData = useCallback(async () => {
    try {
      const [contactsRes, dealsRes] = await Promise.all([
        fetch("/api/crm/contacts?limit=100&sort_by=first_name&sort_order=asc"),
        fetch("/api/crm/deals?limit=100&sort_by=title&sort_order=asc"),
      ]);
      const contactsJson = await contactsRes.json();
      const dealsJson = await dealsRes.json();
      if (contactsJson.success) setContacts(contactsJson.data);
      if (dealsJson.success) setDeals(dealsJson.data);
    } catch {
      // Silently fail — selects will just be empty
    }
  }, []);

  // ============================================================================
  // Form
  // ============================================================================

  useEffect(() => {
    if (formMode.type === "edit") {
      const s = formMode.showing;
      setFormValues({
        title: s.title,
        address: s.address,
        showing_date: s.showing_date ? s.showing_date.slice(0, 16) : "",
        duration_minutes: String(s.duration_minutes || 60),
        contact_id: s.contact_id || "",
        deal_id: s.deal_id || "",
        status: s.status,
        result_notes: s.result_notes || "",
      });
      loadFormData();
    } else if (formMode.type === "create") {
      setFormValues({ duration_minutes: "60", status: "scheduled" });
      loadFormData();
    }
  }, [formMode, loadFormData]);

  const set = (name: string, value: string) =>
    setFormValues((prev) => ({ ...prev, [name]: value }));

  const handleFormSubmit = async () => {
    if (!formValues.title?.trim() || !formValues.address?.trim() || !formValues.showing_date) {
      toast.error(t("crm.entityForm.required", { field: t("crm.showings.fields.title") }));
      return;
    }
    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        title: formValues.title.trim(),
        address: formValues.address.trim(),
        showing_date: new Date(formValues.showing_date).toISOString(),
        duration_minutes: Number(formValues.duration_minutes) || 60,
        contact_id: formValues.contact_id || null,
        deal_id: formValues.deal_id || null,
        status: formValues.status || "scheduled",
        result_notes: formValues.result_notes?.trim() || undefined,
      };

      const isEdit = formMode.type === "edit";
      const url = isEdit ? `/api/crm/showings/${formMode.showing.id}` : "/api/crm/showings";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(t("crm.showings.saved"));
        setFormMode({ type: "closed" });
        fetchShowings(1, false);
      } else {
        handleApiError(json);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================================
  // Bulk actions
  // ============================================================================

  const handleBulkDelete = async () => {
    setIsBulkLoading(true);
    try {
      const res = await fetch("/api/crm/showings/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", ids: Array.from(selectedIds) }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(t("crm.showings.deleted"));
        setSelectedIds(new Set());
        setConfirmDelete(false);
        fetchShowings(1, false);
      } else handleApiError(json);
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleBulkStatusChange = async (status: string) => {
    setIsBulkLoading(true);
    try {
      const res = await fetch("/api/crm/showings/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_status", ids: Array.from(selectedIds), status }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(t("common.updated"));
        setSelectedIds(new Set());
        fetchShowings(1, false);
      } else handleApiError(json);
    } finally {
      setIsBulkLoading(false);
    }
  };

  // ============================================================================
  // Table columns
  // ============================================================================

  const columns: Column<ShowingRow>[] = useMemo(() => [
    {
      key: "title",
      label: t("crm.showings.fields.title"),
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-medium">{row.title}</span>
        </div>
      ),
    },
    {
      key: "address",
      label: t("crm.showings.fields.address"),
      sortable: true,
      render: (row) => <span className="text-sm text-muted-foreground truncate max-w-[200px] block">{row.address}</span>,
    },
    {
      key: "showing_date",
      label: t("crm.showings.fields.showingDate"),
      sortable: true,
      render: (row) => {
        const d = new Date(row.showing_date);
        return (
          <span className="text-sm whitespace-nowrap">
            {format(d, "dd.MM.yyyy HH:mm")}
          </span>
        );
      },
    },
    {
      key: "contact",
      label: t("crm.showings.fields.contact"),
      render: (row) => {
        if (!row.contacts) return <span className="text-muted-foreground">—</span>;
        return <span className="text-sm">{row.contacts.first_name} {row.contacts.last_name || ""}</span>;
      },
    },
    {
      key: "status",
      label: t("crm.showings.fields.status"),
      sortable: true,
      render: (row) => (
        <StatusBadge
          status={row.status}
          label={t(`crm.showings.statuses.${row.status}`)}
        />
      ),
    },
  ], [t]);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <PageContainer>
      <PageHeader title={t("crm.showings.title")} />

      <div className="flex items-center gap-2 mb-4">
        <ViewControls
          search={search}
          onSearchChange={setSearch}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          filterOptions={filterOptions}
          activeFilters={activeFilters}
          onFilterAdd={(field, value) => {
            setActiveFilters(prev => {
              const filtered = prev.filter(f => f.field !== field);
              const opt = filterOptions.find(f => f.field === field);
              const label = opt?.options?.find(o => o.value === value)?.label || value;
              return [...filtered, { field, value, label }];
            });
          }}
          onFilterRemove={(field) => setActiveFilters(prev => prev.filter(f => f.field !== field))}
          onFiltersClear={() => setActiveFilters([])}
          sortOptions={sortOptions}
          currentSort={sortBy}
          sortOrder={sortOrder}
          onSortChange={(field, order) => { setSortBy(field); setSortOrder(order); }}
          onAdd={() => setFormMode({ type: "create" })}
          addLabel={t("crm.showings.newShowing")}
          totalCount={total}
          entityName={t("crm.showings.title")}
          className="flex-1"
        />
        {/* Table / Calendar toggle */}
        <div className="flex items-center border rounded-md">
          <Button
            variant={displayMode === "table" ? "secondary" : "ghost"}
            size="sm"
            className="rounded-r-none"
            onClick={() => setDisplayMode("table")}
          >
            <Table2 className="size-4 mr-1" />
            {t("crm.showings.table")}
          </Button>
          <Button
            variant={displayMode === "calendar" ? "secondary" : "ghost"}
            size="sm"
            className="rounded-l-none"
            onClick={() => setDisplayMode("calendar")}
          >
            <CalendarIcon className="size-4 mr-1" />
            {t("crm.showings.calendar")}
          </Button>
        </div>
      </div>

      {/* Content */}
      {displayMode === "table" ? (
        <DataTable
          columns={columns}
          data={showings}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={(field, order) => { setSortBy(field); setSortOrder(order); }}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onRowClick={handleRowClick}
          onLoadMore={handleLoadMore}
          isLoadingMore={isLoadingMore}
          hasMore={showings.length < total}
          loading={isLoading}
          emptyMessage={t("crm.showings.noShowings")}
        />
      ) : (
        <ShowingsCalendar
          showings={showings}
          onShowingClick={(s) => setFormMode({ type: "edit", showing: s })}
          month={calendarMonth}
          onMonthChange={setCalendarMonth}
          locale={locale}
        />
      )}

      {/* Bulk action bar */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        onDeselectAll={() => setSelectedIds(new Set())}
        actions={[
          {
            label: t("crm.showings.fields.status"),
            dropdown: [
              { label: t("crm.showings.statuses.scheduled"), value: "scheduled" },
              { label: t("crm.showings.statuses.completed"), value: "completed" },
              { label: t("crm.showings.statuses.cancelled"), value: "cancelled" },
              { label: t("crm.showings.statuses.no_show"), value: "no_show" },
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

      {/* Delete confirmation */}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        onConfirm={handleBulkDelete}
        title={t("common.delete")}
        description={`${t("common.delete")} ${selectedIds.size}?`}
        isLoading={isBulkLoading}
      />

      {/* Create / Edit Dialog */}
      <Dialog open={formMode.type !== "closed"} onOpenChange={(open) => { if (!open) setFormMode({ type: "closed" }); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {formMode.type === "create" ? t("crm.showings.newShowing") : t("crm.showings.editShowing")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <Label>{t("crm.showings.fields.title")} *</Label>
              <Input
                value={formValues.title || ""}
                onChange={(e) => set("title", e.target.value)}
                placeholder={t("crm.showings.fields.title")}
              />
            </div>

            {/* Address */}
            <div>
              <Label>{t("crm.showings.fields.address")} *</Label>
              <Input
                value={formValues.address || ""}
                onChange={(e) => set("address", e.target.value)}
                placeholder={t("crm.showings.fields.address")}
              />
            </div>

            {/* Date & Duration */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("crm.showings.fields.showingDate")} *</Label>
                <Input
                  type="datetime-local"
                  value={formValues.showing_date || ""}
                  onChange={(e) => set("showing_date", e.target.value)}
                />
              </div>
              <div>
                <Label>{t("crm.showings.fields.duration")}</Label>
                <Input
                  type="number"
                  min={15}
                  max={480}
                  value={formValues.duration_minutes || "60"}
                  onChange={(e) => set("duration_minutes", e.target.value)}
                />
              </div>
            </div>

            {/* Contact & Deal */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("crm.showings.fields.contact")}</Label>
                <select
                  className={selectClass}
                  value={formValues.contact_id || ""}
                  onChange={(e) => set("contact_id", e.target.value)}
                >
                  <option value="">—</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name || ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>{t("crm.showings.fields.deal")}</Label>
                <select
                  className={selectClass}
                  value={formValues.deal_id || ""}
                  onChange={(e) => set("deal_id", e.target.value)}
                >
                  <option value="">—</option>
                  {deals.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status */}
            <div>
              <Label>{t("crm.showings.fields.status")}</Label>
              <select
                className={selectClass}
                value={formValues.status || "scheduled"}
                onChange={(e) => set("status", e.target.value)}
              >
                <option value="scheduled">{t("crm.showings.statuses.scheduled")}</option>
                <option value="completed">{t("crm.showings.statuses.completed")}</option>
                <option value="cancelled">{t("crm.showings.statuses.cancelled")}</option>
                <option value="no_show">{t("crm.showings.statuses.no_show")}</option>
              </select>
            </div>

            {/* Result notes */}
            <div>
              <Label>{t("crm.showings.fields.resultNotes")}</Label>
              <Textarea
                value={formValues.result_notes || ""}
                onChange={(e) => set("result_notes", e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormMode({ type: "closed" })}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleFormSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 mr-1.5 animate-spin" />}
              {formMode.type === "create" ? t("common.create") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
