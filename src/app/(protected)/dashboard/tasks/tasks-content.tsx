"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { ViewControls, type FilterOption, type ActiveFilter, type SortOption, type GroupByOption } from "@/components/frappe/view-controls";
import { DataTable, type Column } from "@/components/frappe/data-table";
import { KanbanBoard, type KanbanColumn } from "@/components/frappe/kanban-board";
import { GroupByView, type GroupByGroup } from "@/components/frappe/group-by-view";
import { StatusBadge } from "@/components/frappe/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BulkActionBar } from "@/components/crm/bulk-action-bar";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { CheckSquare, Loader2, Phone, Mail, MapPin } from "lucide-react";
import { toast } from "sonner";
import type { ViewMode } from "@/types/crm";

// ============================================================================
// Types
// ============================================================================

interface TaskData {
  id: string;
  title: string;
  description: string | null;
  type: string;
  priority: string;
  status: string;
  due_date: string | null;
  is_ai_generated: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

type FormMode = { type: "closed" } | { type: "create" } | { type: "edit"; task: TaskData };

// ============================================================================
// Constants
// ============================================================================

const FILTER_OPTIONS: FilterOption[] = [
  {
    field: "status", label: "Status", type: "select",
    options: [
      { value: "todo", label: "To Do" },
      { value: "in_progress", label: "In Progress" },
      { value: "done", label: "Done" },
      { value: "cancelled", label: "Cancelled" },
    ],
  },
  {
    field: "priority", label: "Priority", type: "select",
    options: [
      { value: "urgent", label: "Urgent" },
      { value: "high", label: "High" },
      { value: "medium", label: "Medium" },
      { value: "low", label: "Low" },
    ],
  },
  {
    field: "type", label: "Type", type: "select",
    options: [
      { value: "call", label: "Call" },
      { value: "email", label: "Email" },
      { value: "meeting", label: "Meeting" },
      { value: "follow_up", label: "Follow Up" },
      { value: "other", label: "Other" },
    ],
  },
];

const SORT_OPTIONS: SortOption[] = [
  { field: "created_at", label: "Created" },
  { field: "due_date", label: "Due Date" },
  { field: "priority", label: "Priority" },
  { field: "title", label: "Title" },
];

const GROUP_BY_OPTIONS: GroupByOption[] = [
  { field: "status", label: "Status" },
  { field: "priority", label: "Priority" },
  { field: "type", label: "Type" },
];

const KANBAN_COLUMNS: KanbanColumn[] = [
  { id: "todo", title: "To Do", color: "bg-gray-500" },
  { id: "in_progress", title: "In Progress", color: "bg-blue-500" },
  { id: "done", title: "Done", color: "bg-emerald-500" },
  { id: "cancelled", title: "Cancelled", color: "bg-red-500" },
];

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "text-red-600",
  high: "text-orange-600",
  medium: "text-amber-600",
  low: "text-blue-600",
};

const contextFields: Record<string, { name: string; label: string; inputType: string; icon: typeof Phone; placeholder: string }> = {
  call: { name: "phone_number", label: "Phone Number", inputType: "tel", icon: Phone, placeholder: "+1 (555) 000-0000" },
  email: { name: "email_address", label: "Email Address", inputType: "email", icon: Mail, placeholder: "email@example.com" },
  meeting: { name: "location", label: "Location", inputType: "text", icon: MapPin, placeholder: "Office, Zoom link, etc." },
};

const selectClass = "flex h-9 w-full rounded-md border border-input bg-transparent px-4 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

const PAGE_SIZE = 50;

// ============================================================================
// Component
// ============================================================================

export function TasksContent() {
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [groupBy, setGroupBy] = useState<string | null>("status");

  const [formMode, setFormMode] = useState<FormMode>({ type: "closed" });
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  const fetchTasks = useCallback(async () => {
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
      const res = await fetch(`/api/crm/tasks?${params}`);
      const json = await res.json();
      if (json.success) {
        setTasks(json.data);
        setTotal(json.total || 0);
      }
    } finally {
      setIsLoading(false);
    }
  }, [search, sortBy, sortOrder, page, activeFilters]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useEffect(() => { setSelectedIds(new Set()); }, [search, activeFilters]);
  useEffect(() => { setPage(1); }, [search, activeFilters, sortBy, sortOrder]);

  // Form init
  useEffect(() => {
    if (formMode.type === "edit") {
      const meta = (formMode.task.metadata || {}) as Record<string, string>;
      setFormValues({
        title: formMode.task.title,
        description: formMode.task.description || "",
        type: formMode.task.type || "",
        priority: formMode.task.priority || "",
        status: formMode.task.status || "todo",
        due_date: formMode.task.due_date ? formMode.task.due_date.split("T")[0] : "",
        phone_number: meta.phone_number || "",
        email_address: meta.email_address || "",
        location: meta.location || "",
      });
    } else if (formMode.type === "create") {
      setFormValues({});
    }
  }, [formMode]);

  const set = (name: string, value: string) =>
    setFormValues((prev) => ({ ...prev, [name]: value }));

  // Handlers
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
    setTasks(prev => prev.map(t => t.id === itemId ? { ...t, status: toColumn } : t));
    const res = await fetch(`/api/crm/tasks/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: toColumn }),
    });
    if (!res.ok) {
      toast.error("Failed to update status");
      fetchTasks();
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const metadata: Record<string, string> = {};
      const metaKeys = ["phone_number", "email_address", "location"];
      for (const key of metaKeys) {
        if (formValues[key]) metadata[key] = formValues[key];
      }
      const payload: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(formValues)) {
        if (metaKeys.includes(key)) continue;
        if (val !== "") payload[key] = val;
      }
      if (Object.keys(metadata).length > 0) payload.metadata = metadata;

      const isEdit = formMode.type === "edit";
      const url = isEdit ? `/api/crm/tasks/${formMode.task.id}` : "/api/crm/tasks";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (json.success) {
        toast.success(isEdit ? "Task updated" : "Task created");
        fetchTasks();
        setFormMode({ type: "closed" });
      } else {
        toast.error(json.error || "Failed");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkDelete = async () => {
    setIsBulkLoading(true);
    try {
      const ids = Array.from(selectedIds);
      const res = await fetch("/api/crm/tasks/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", ids }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Deleted ${ids.length} task${ids.length !== 1 ? "s" : ""}`);
        setSelectedIds(new Set());
        fetchTasks();
      } else {
        toast.error(json.error || "Failed");
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
      const res = await fetch("/api/crm/tasks/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_status", ids, status }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Updated ${ids.length} task${ids.length !== 1 ? "s" : ""}`);
        setSelectedIds(new Set());
        fetchTasks();
      } else {
        toast.error(json.error || "Failed");
      }
    } finally {
      setIsBulkLoading(false);
    }
  };

  const formatDueDate = (date: string | null) => {
    if (!date) return "—";
    const d = new Date(date);
    const now = new Date();
    const diff = d.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (days < 0) return <span className="text-red-600 font-medium">{label}</span>;
    if (days === 0) return <span className="text-amber-600 font-medium">{label}</span>;
    return label;
  };

  const columns: Column<TaskData>[] = useMemo(() => [
    {
      key: "title", label: "Title", sortable: true,
      render: (t) => (
        <div>
          <span className="font-medium">{t.title}</span>
          {t.is_ai_generated && <span className="ml-1 text-[10px] text-muted-foreground">AI</span>}
        </div>
      ),
    },
    {
      key: "type", label: "Type",
      render: (t) => <span className="text-xs capitalize">{t.type?.replace("_", " ") || "—"}</span>,
    },
    {
      key: "priority", label: "Priority", sortable: true,
      render: (t) => (
        <span className={`text-xs font-medium capitalize ${PRIORITY_COLORS[t.priority] || ""}`}>
          {t.priority || "—"}
        </span>
      ),
    },
    {
      key: "status", label: "Status", sortable: true,
      render: (t) => <StatusBadge status={t.status} />,
    },
    {
      key: "due_date", label: "Due Date", sortable: true,
      render: (t) => <span className="text-xs">{formatDueDate(t.due_date)}</span>,
    },
  ], []);

  const groups: GroupByGroup<TaskData>[] = useMemo(() => {
    if (!groupBy) return [];
    const map = new Map<string, TaskData[]>();
    for (const t of tasks) {
      const key = String((t as unknown as Record<string, unknown>)[groupBy] ?? "—");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return Array.from(map.entries()).map(([key, items]) => ({
      key, label: key.replace("_", " "), count: items.length, items,
    }));
  }, [tasks, groupBy]);

  const kanbanColumns: KanbanColumn[] = useMemo(() =>
    KANBAN_COLUMNS.map(col => ({
      ...col,
      count: tasks.filter(t => t.status === col.id).length,
    })), [tasks]);

  const kanbanItems = useMemo(() =>
    tasks.map(t => ({ ...t, columnId: t.status })), [tasks]);

  const isEdit = formMode.type === "edit";
  const selectedType = formValues.type || "";
  const ctxField = contextFields[selectedType];

  return (
    <PageContainer>
      <PageHeader title="Tasks" description={`${total} task${total !== 1 ? "s" : ""}`} />

      <ViewControls
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search tasks..."
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
        entityName={`task${total !== 1 ? "s" : ""}`}
        onAdd={() => setFormMode({ type: "create" })}
        addLabel="New Task"
      />

      {viewMode === "table" && (
        <DataTable
          columns={columns}
          data={tasks}
          loading={isLoading}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSortChange}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onRowClick={(t) => {
            const task = tasks.find(x => x.id === t.id);
            if (task) setFormMode({ type: "edit", task });
          }}
          page={page}
          pageSize={PAGE_SIZE}
          totalCount={total}
          onPageChange={setPage}
          emptyMessage={search || activeFilters.length ? "No matching tasks" : "No tasks yet"}
        />
      )}

      {viewMode === "kanban" && !isLoading && (
        <KanbanBoard
          columns={kanbanColumns}
          cards={kanbanItems}
          onCardMove={(id, _from, to) => handleKanbanMove(id, to)}
          renderCard={(t) => (
            <div
              className="cursor-pointer"
              onClick={() => {
                const task = tasks.find(x => x.id === t.id);
                if (task) setFormMode({ type: "edit", task });
              }}
            >
              <span className="text-sm font-medium">{t.title}</span>
              <div className="flex items-center gap-2 mt-1">
                {t.priority && (
                  <span className={`text-[10px] font-medium capitalize ${PRIORITY_COLORS[t.priority] || ""}`}>
                    {t.priority}
                  </span>
                )}
                {t.due_date && (
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(t.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                )}
              </div>
            </div>
          )}
        />
      )}

      {viewMode === "group_by" && (
        <GroupByView
          groups={groups}
          emptyMessage="No tasks to group"
          renderItem={(t) => (
            <div
              key={t.id}
              className="flex items-center justify-between px-4 py-2 hover:bg-muted/30 cursor-pointer rounded-md transition-colors"
              onClick={() => {
                const task = tasks.find(x => x.id === t.id);
                if (task) setFormMode({ type: "edit", task });
              }}
            >
              <div className="flex items-center gap-3">
                <CheckSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium">{t.title}</span>
              </div>
              <div className="flex items-center gap-2">
                {t.priority && (
                  <span className={`text-xs font-medium capitalize ${PRIORITY_COLORS[t.priority] || ""}`}>
                    {t.priority}
                  </span>
                )}
                <StatusBadge status={t.status} />
              </div>
            </div>
          )}
        />
      )}

      {/* Task Form Dialog */}
      <Dialog
        open={formMode.type !== "closed"}
        onOpenChange={(open) => { if (!open) setFormMode({ type: "closed" }); }}
      >
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Task" : "New Task"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input value={formValues.title || ""} onChange={(e) => set("title", e.target.value)} placeholder="Follow up with..." required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea value={formValues.description || ""} onChange={(e) => set("description", e.target.value)} placeholder="Details..." rows={3} />
            </div>
            {isEdit && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <select value={formValues.status || "todo"} onChange={(e) => set("status", e.target.value)} className={selectClass}>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <select value={formValues.type || ""} onChange={(e) => set("type", e.target.value)} className={selectClass}>
                <option value="">Select...</option>
                <option value="call">Call</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
                <option value="follow_up">Follow Up</option>
                <option value="other">Other</option>
              </select>
            </div>
            {ctxField && (
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <ctxField.icon className="size-3.5" />
                  {ctxField.label}
                </label>
                <Input type={ctxField.inputType} value={formValues[ctxField.name] || ""} onChange={(e) => set(ctxField.name, e.target.value)} placeholder={ctxField.placeholder} />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <select value={formValues.priority || ""} onChange={(e) => set("priority", e.target.value)} className={selectClass}>
                <option value="">Select...</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Due Date</label>
              <Input type="date" value={formValues.due_date || ""} onChange={(e) => set("due_date", e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormMode({ type: "closed" })}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="size-4 mr-2 animate-spin" />}
                {isEdit ? "Save" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <BulkActionBar
        selectedCount={selectedIds.size}
        onDeselectAll={() => setSelectedIds(new Set())}
        actions={[
          {
            label: "Change Status",
            dropdown: [
              { label: "To Do", value: "todo" },
              { label: "In Progress", value: "in_progress" },
              { label: "Done", value: "done" },
              { label: "Cancelled", value: "cancelled" },
            ],
            onDropdownSelect: handleBulkStatusChange,
          },
          { label: "Delete", variant: "destructive", onClick: () => setConfirmDelete(true) },
        ]}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete tasks"
        description={`Delete ${selectedIds.size} task${selectedIds.size !== 1 ? "s" : ""}?`}
        confirmLabel="Delete"
        variant="destructive"
        isLoading={isBulkLoading}
        onConfirm={handleBulkDelete}
      />
    </PageContainer>
  );
}
