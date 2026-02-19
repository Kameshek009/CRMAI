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
import { CheckSquare, Loader2, Phone, Mail, MapPin, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { handleApiError } from "@/lib/crm/handle-api-error";
import { useFeatureLimitStore } from "@/stores/feature-limit-store";
import { useTranslation } from "@/lib/i18n";
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

interface TaskAttachment {
  id: string;
  url: string;
  filename: string;
  mime_type: string;
  size: number;
}

type FormMode = { type: "closed" } | { type: "create" } | { type: "edit"; task: TaskData };

// ============================================================================
// Constants
// ============================================================================

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "text-red-600",
  high: "text-orange-600",
  medium: "text-amber-600",
  low: "text-blue-600",
};

const selectClass = "flex h-9 w-full rounded-md border border-input bg-transparent px-4 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

const PAGE_SIZE = 50;

// ============================================================================
// Component
// ============================================================================

export function TasksContent() {
  const { t } = useTranslation();
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

  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  const filterOptions: FilterOption[] = useMemo(() => [
    {
      field: "status", label: t("crm.tasks.fields.status"), type: "select",
      options: [
        { value: "todo", label: t("crm.tasks.statuses.todo") },
        { value: "in_progress", label: t("crm.tasks.statuses.inProgress") },
        { value: "done", label: t("crm.tasks.statuses.done") },
        { value: "cancelled", label: t("crm.tasks.statuses.cancelled") },
      ],
    },
    {
      field: "priority", label: t("crm.tasks.fields.priority"), type: "select",
      options: [
        { value: "urgent", label: t("crm.tasks.priorities.urgent") },
        { value: "high", label: t("crm.tasks.priorities.high") },
        { value: "medium", label: t("crm.tasks.priorities.medium") },
        { value: "low", label: t("crm.tasks.priorities.low") },
      ],
    },
    {
      field: "type", label: t("crm.tasks.fields.type"), type: "select",
      options: [
        { value: "call", label: t("crm.tasks.types.call") },
        { value: "email", label: t("crm.tasks.types.email") },
        { value: "meeting", label: t("crm.tasks.types.meeting") },
        { value: "follow_up", label: t("crm.tasks.types.followUp") },
        { value: "other", label: t("crm.tasks.types.other") },
      ],
    },
  ], [t]);

  const sortOptions: SortOption[] = useMemo(() => [
    { field: "created_at", label: t("crm.tasks.sort.created") },
    { field: "due_date", label: t("crm.tasks.sort.dueDate") },
    { field: "priority", label: t("crm.tasks.sort.priority") },
    { field: "title", label: t("crm.tasks.sort.title") },
  ], [t]);

  const groupByOptions: GroupByOption[] = useMemo(() => [
    { field: "status", label: t("crm.tasks.groupBy.status") },
    { field: "priority", label: t("crm.tasks.groupBy.priority") },
    { field: "type", label: t("crm.tasks.groupBy.type") },
  ], [t]);

  const kanbanColumns: KanbanColumn[] = useMemo(() => [
    { id: "todo", title: t("crm.tasks.statuses.todo"), color: "bg-gray-500" },
    { id: "in_progress", title: t("crm.tasks.statuses.inProgress"), color: "bg-blue-500" },
    { id: "done", title: t("crm.tasks.statuses.done"), color: "bg-emerald-500" },
    { id: "cancelled", title: t("crm.tasks.statuses.cancelled"), color: "bg-red-500" },
  ], [t]);

  const contextFields: Record<string, { name: string; label: string; inputType: string; icon: typeof Phone; placeholder: string }> = useMemo(() => ({
    call: { name: "phone_number", label: t("crm.tasks.fields.phoneNumber"), inputType: "tel", icon: Phone, placeholder: t("crm.tasks.placeholders.phone") },
    email: { name: "email_address", label: t("crm.tasks.fields.emailAddress"), inputType: "email", icon: Mail, placeholder: t("crm.tasks.placeholders.email") },
    meeting: { name: "location", label: t("crm.tasks.fields.location"), inputType: "text", icon: MapPin, placeholder: t("crm.tasks.placeholders.location") },
  }), [t]);

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
      const meta = (formMode.task.metadata || {}) as Record<string, unknown>;
      const metaStr = meta as Record<string, string>;
      setFormValues({
        title: formMode.task.title,
        description: formMode.task.description || "",
        type: formMode.task.type || "",
        priority: formMode.task.priority || "",
        status: formMode.task.status || "todo",
        due_date: formMode.task.due_date ? formMode.task.due_date.split("T")[0] : "",
        phone_number: metaStr.phone_number || "",
        email_address: metaStr.email_address || "",
        location: metaStr.location || "",
      });
      setAttachments((meta.attachments as TaskAttachment[]) || []);
    } else if (formMode.type === "create") {
      setFormValues({});
      setAttachments([]);
    }
  }, [formMode]);

  const set = (name: string, value: string) =>
    setFormValues((prev) => ({ ...prev, [name]: value }));

  // Photo handlers
  const handlePhotoUpload = async (file: File) => {
    if (formMode.type !== "edit") return;
    if (attachments.length >= 15) {
      toast.error(t("crm.tasks.maxPhotos", { max: 5 }));
      return;
    }
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/crm/tasks/${formMode.task.id}/upload`, { method: "POST", body: fd });
      const json = await res.json();
      if (json.success) {
        setAttachments(json.attachments);
        toast.success(t("crm.tasks.photoUploaded"));
      } else {
        toast.error(json.error || t("crm.tasks.uploadFailed"));
      }
    } catch {
      toast.error(t("crm.tasks.uploadFailed"));
    } finally {
      setIsUploading(false);
    }
  };

  const handlePhotoDelete = async (attachmentId: string) => {
    if (formMode.type !== "edit") return;
    try {
      const res = await fetch(`/api/crm/tasks/${formMode.task.id}/upload`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attachmentId }),
      });
      const json = await res.json();
      if (json.success) {
        setAttachments(json.attachments);
        toast.success(t("crm.tasks.photoDeleted"));
      }
    } catch {
      toast.error(t("common.failed"));
    }
  };

  // Handlers
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

  const handleKanbanMove = async (itemId: string, toColumn: string) => {
    setTasks(prev => prev.map(t => t.id === itemId ? { ...t, status: toColumn } : t));
    const res = await fetch(`/api/crm/tasks/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: toColumn }),
    });
    if (!res.ok) {
      toast.error(t("crm.tasks.failedStatus"));
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
        toast.success(isEdit ? t("crm.tasks.updated") : t("crm.tasks.created"));
        if (!isEdit) useFeatureLimitStore.getState().incrementUsage("tasks");
        fetchTasks();
        setFormMode({ type: "closed" });
      } else {
        handleApiError(json);
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
        toast.success(t("crm.tasks.deleted", { count: ids.length }));
        setSelectedIds(new Set());
        fetchTasks();
      } else {
        toast.error(json.error || t("common.failed"));
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
        toast.success(t("crm.tasks.statusUpdated", { count: ids.length }));
        setSelectedIds(new Set());
        fetchTasks();
      } else {
        toast.error(json.error || t("common.failed"));
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
    const label = d.toLocaleDateString("ru-RU", { month: "short", day: "numeric" });
    if (days < 0) return <span className="text-red-600 font-medium">{label}</span>;
    if (days === 0) return <span className="text-amber-600 font-medium">{label}</span>;
    return label;
  };

  const columns: Column<TaskData>[] = useMemo(() => [
    {
      key: "title", label: t("crm.tasks.fields.title"), sortable: true,
      render: (task) => (
        <div>
          <span className="font-medium">{task.title}</span>
          {task.is_ai_generated && <span className="ml-1 text-[10px] text-muted-foreground">AI</span>}
        </div>
      ),
    },
    {
      key: "type", label: t("crm.tasks.fields.type"),
      render: (task) => {
        const typeKey = task.type?.replace("_", "") as string;
        const typeMap: Record<string, string> = { call: "call", email: "email", meeting: "meeting", follow_up: "followUp", followup: "followUp", other: "other" };
        const key = typeMap[task.type] || task.type;
        return <span className="text-xs">{t(`crm.tasks.types.${key}`) || task.type || "—"}</span>;
      },
    },
    {
      key: "priority", label: t("crm.tasks.fields.priority"), sortable: true,
      render: (task) => {
        const prioLabel = t(`crm.tasks.priorities.${task.priority}`);
        return (
          <span className={`text-xs font-medium ${PRIORITY_COLORS[task.priority] || ""}`}>
            {prioLabel || task.priority || "—"}
          </span>
        );
      },
    },
    {
      key: "status", label: t("crm.tasks.fields.status"), sortable: true,
      render: (task) => <StatusBadge status={task.status} />,
    },
    {
      key: "due_date", label: t("crm.tasks.fields.dueDate"), sortable: true,
      render: (task) => <span className="text-xs">{formatDueDate(task.due_date)}</span>,
    },
  ], [t]);

  const groups: GroupByGroup<TaskData>[] = useMemo(() => {
    if (!groupBy) return [];
    const map = new Map<string, TaskData[]>();
    for (const task of tasks) {
      const key = String((task as unknown as Record<string, unknown>)[groupBy] ?? "—");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    }
    return Array.from(map.entries()).map(([key, items]) => ({
      key, label: key.replace("_", " "), count: items.length, items,
    }));
  }, [tasks, groupBy]);

  const kanbanCols: KanbanColumn[] = useMemo(() =>
    kanbanColumns.map(col => ({
      ...col,
      count: tasks.filter(task => task.status === col.id).length,
    })), [tasks, kanbanColumns]);

  const kanbanItems = useMemo(() =>
    tasks.map(task => ({ ...task, columnId: task.status })), [tasks]);

  const isEdit = formMode.type === "edit";
  const selectedType = formValues.type || "";
  const ctxField = contextFields[selectedType];

  const taskCount = total !== 1
    ? t("crm.tasks.count", { count: total })
    : t("crm.tasks.countOne", { count: total });

  return (
    <PageContainer>
      <PageHeader title={t("crm.tasks.title")} description={taskCount} />

      <ViewControls
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t("crm.tasks.searchPlaceholder")}
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
        groupByOptions={groupByOptions}
        currentGroupBy={groupBy}
        onGroupByChange={setGroupBy}
        totalCount={total}
        entityName={taskCount}
        onAdd={() => setFormMode({ type: "create" })}
        addLabel={t("crm.tasks.new")}
        featureLimitKey="tasks"
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
          onRowClick={(task) => {
            const found = tasks.find(x => x.id === task.id);
            if (found) setFormMode({ type: "edit", task: found });
          }}
          page={page}
          pageSize={PAGE_SIZE}
          totalCount={total}
          onPageChange={setPage}
          emptyMessage={search || activeFilters.length ? t("crm.tasks.noMatching") : t("crm.tasks.noYet")}
        />
      )}

      {viewMode === "kanban" && !isLoading && (
        <KanbanBoard
          columns={kanbanCols}
          cards={kanbanItems}
          onCardMove={(id, _from, to) => handleKanbanMove(id, to)}
          renderCard={(task) => (
            <div
              className="cursor-pointer"
              onClick={() => {
                const found = tasks.find(x => x.id === task.id);
                if (found) setFormMode({ type: "edit", task: found });
              }}
            >
              <span className="text-sm font-medium">{task.title}</span>
              <div className="flex items-center gap-2 mt-1">
                {task.priority && (
                  <span className={`text-[10px] font-medium ${PRIORITY_COLORS[task.priority] || ""}`}>
                    {t(`crm.tasks.priorities.${task.priority}`)}
                  </span>
                )}
                {task.due_date && (
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(task.due_date).toLocaleDateString("ru-RU", { month: "short", day: "numeric" })}
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
          emptyMessage={t("crm.tasks.noGroup")}
          renderItem={(task) => (
            <div
              key={task.id}
              className="flex items-center justify-between px-4 py-2 hover:bg-muted/30 cursor-pointer rounded-md transition-colors"
              onClick={() => {
                const found = tasks.find(x => x.id === task.id);
                if (found) setFormMode({ type: "edit", task: found });
              }}
            >
              <div className="flex items-center gap-3">
                <CheckSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium">{task.title}</span>
              </div>
              <div className="flex items-center gap-2">
                {task.priority && (
                  <span className={`text-xs font-medium ${PRIORITY_COLORS[task.priority] || ""}`}>
                    {t(`crm.tasks.priorities.${task.priority}`)}
                  </span>
                )}
                <StatusBadge status={task.status} />
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
            <DialogTitle>{isEdit ? t("crm.tasks.edit") : t("crm.tasks.new")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("crm.tasks.fields.title")}</label>
              <Input value={formValues.title || ""} onChange={(e) => set("title", e.target.value)} placeholder={t("crm.tasks.placeholders.title")} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("crm.tasks.fields.description")}</label>
              <Textarea value={formValues.description || ""} onChange={(e) => set("description", e.target.value)} placeholder={t("crm.tasks.placeholders.description")} rows={3} />
            </div>
            {isEdit && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("crm.tasks.fields.status")}</label>
                <select value={formValues.status || "todo"} onChange={(e) => set("status", e.target.value)} className={selectClass}>
                  <option value="todo">{t("crm.tasks.statuses.todo")}</option>
                  <option value="in_progress">{t("crm.tasks.statuses.inProgress")}</option>
                  <option value="done">{t("crm.tasks.statuses.done")}</option>
                </select>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("crm.tasks.fields.type")}</label>
              <select value={formValues.type || ""} onChange={(e) => set("type", e.target.value)} className={selectClass}>
                <option value="">{t("crm.entityForm.select")}</option>
                <option value="call">{t("crm.tasks.types.call")}</option>
                <option value="email">{t("crm.tasks.types.email")}</option>
                <option value="meeting">{t("crm.tasks.types.meeting")}</option>
                <option value="follow_up">{t("crm.tasks.types.followUp")}</option>
                <option value="other">{t("crm.tasks.types.other")}</option>
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
              <label className="text-sm font-medium">{t("crm.tasks.fields.priority")}</label>
              <select value={formValues.priority || ""} onChange={(e) => set("priority", e.target.value)} className={selectClass}>
                <option value="">{t("crm.entityForm.select")}</option>
                <option value="low">{t("crm.tasks.priorities.low")}</option>
                <option value="medium">{t("crm.tasks.priorities.medium")}</option>
                <option value="high">{t("crm.tasks.priorities.high")}</option>
                <option value="urgent">{t("crm.tasks.priorities.urgent")}</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("crm.tasks.fields.dueDate")}</label>
              <Input type="date" value={formValues.due_date || ""} onChange={(e) => set("due_date", e.target.value)} />
            </div>
            {isEdit && (
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("crm.tasks.photos")}</label>
                <div className="flex flex-wrap gap-2">
                  {attachments.map((att) => (
                    <div key={att.id} className="relative group size-20 rounded-md overflow-hidden border">
                      <img src={att.url} alt={att.filename} className="size-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handlePhotoDelete(att.id)}
                        className="absolute top-0.5 right-0.5 size-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="size-3 text-white" />
                      </button>
                    </div>
                  ))}
                  {attachments.length < 15 && (
                    <label className="size-20 rounded-md border-2 border-dashed flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                      {isUploading ? (
                        <Loader2 className="size-5 animate-spin text-muted-foreground" />
                      ) : (
                        <ImagePlus className="size-5 text-muted-foreground" />
                      )}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        className="hidden"
                        disabled={isUploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePhotoUpload(file);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  )}
                </div>
                {attachments.length > 0 && (
                  <p className="text-xs text-muted-foreground">{attachments.length} / 15</p>
                )}
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormMode({ type: "closed" })}>{t("crm.entityForm.cancel")}</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="size-4 mr-2 animate-spin" />}
                {isEdit ? t("common.save") : t("crm.entityForm.create")}
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
            label: t("crm.tasks.changeStatus"),
            dropdown: [
              { label: t("crm.tasks.statuses.todo"), value: "todo" },
              { label: t("crm.tasks.statuses.inProgress"), value: "in_progress" },
              { label: t("crm.tasks.statuses.done"), value: "done" },
              { label: t("crm.tasks.statuses.cancelled"), value: "cancelled" },
            ],
            onDropdownSelect: handleBulkStatusChange,
          },
          { label: t("common.delete"), variant: "destructive", onClick: () => setConfirmDelete(true) },
        ]}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t("crm.tasks.deleteTitle")}
        description={t("crm.tasks.deleteConfirm", { count: selectedIds.size })}
        confirmLabel={t("common.delete")}
        variant="destructive"
        isLoading={isBulkLoading}
        onConfirm={handleBulkDelete}
      />
    </PageContainer>
  );
}
