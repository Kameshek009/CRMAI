"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { TaskItem } from "@/components/crm/task-item";
import { EmptyState } from "@/components/crm/empty-state";
import { BulkActionBar } from "@/components/crm/bulk-action-bar";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import { useMultiSelect } from "@/hooks/use-multi-select";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  CheckSquare,
  Loader2,
  Phone,
  Mail,
  MapPin,
  Search,
  AlertTriangle,
  Clock,
  CalendarDays,
  ListFilter,
  ArrowUpDown,
  Flame,
} from "lucide-react";
import { toast } from "sonner";

const statusFilters = [
  { label: "All", value: "" },
  { label: "To Do", value: "todo" },
  { label: "In Progress", value: "in_progress" },
  { label: "Done", value: "done" },
];

const priorityFilters = [
  { label: "All Priorities", value: "" },
  { label: "Urgent", value: "urgent", color: "text-red-500" },
  { label: "High", value: "high", color: "text-orange-500" },
  { label: "Medium", value: "medium", color: "text-amber-500" },
  { label: "Low", value: "low", color: "text-blue-500" },
];

const typeFilters = [
  { label: "All Types", value: "" },
  { label: "Call", value: "call" },
  { label: "Email", value: "email" },
  { label: "Meeting", value: "meeting" },
  { label: "Follow Up", value: "follow_up" },
  { label: "Other", value: "other" },
];

const sortOptions = [
  { label: "Due Date", value: "due_date" },
  { label: "Priority", value: "priority" },
  { label: "Created", value: "created_at" },
  { label: "Title", value: "title" },
];

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
  created_at?: string;
}

type FormMode = { type: "closed" } | { type: "create" } | { type: "edit"; task: TaskData };

const contextFields: Record<string, { name: string; label: string; inputType: string; icon: typeof Phone; placeholder: string }> = {
  call: { name: "phone_number", label: "Phone Number", inputType: "tel", icon: Phone, placeholder: "+1 (555) 000-0000" },
  email: { name: "email_address", label: "Email Address", inputType: "email", icon: Mail, placeholder: "email@example.com" },
  meeting: { name: "location", label: "Location", inputType: "text", icon: MapPin, placeholder: "Office, Zoom link, etc." },
};

const selectClass = "flex h-9 w-full rounded-md border border-input bg-transparent px-4 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

export function TasksContent() {
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("due_date");
  const [formMode, setFormMode] = useState<FormMode>({ type: "closed" });
  const [total, setTotal] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const PAGE_SIZE = 50;

  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { selectedIds, toggle, selectAll, deselectAll, isSelected, isAllSelected, count } = useMultiSelect();

  const selectable = count > 0;

  const fetchTasks = useCallback(async (offset = 0, append = false) => {
    if (!append) setIsLoading(true);
    else setIsLoadingMore(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (statusFilter) params.set("status", statusFilter);
      params.set("offset", String(offset));
      const res = await fetch(`/api/crm/tasks?${params}`);
      const json = await res.json();
      if (json.success) {
        setTasks((prev) => append ? [...prev, ...json.data] : json.data);
        setTotal(json.total || 0);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  useEffect(() => {
    deselectAll();
  }, [statusFilter, deselectAll]);

  // Client-side filtering and sorting
  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((t) => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q));
    }
    if (priorityFilter) {
      result = result.filter((t) => t.priority === priorityFilter);
    }
    if (typeFilter) {
      result = result.filter((t) => t.type === typeFilter);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === "due_date") {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      if (sortBy === "priority") {
        return (PRIORITY_ORDER[a.priority] ?? 4) - (PRIORITY_ORDER[b.priority] ?? 4);
      }
      if (sortBy === "title") {
        return a.title.localeCompare(b.title);
      }
      return 0; // created_at default from API
    });

    return result;
  }, [tasks, search, priorityFilter, typeFilter, sortBy]);

  const hasMore = tasks.length < total;

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    let overdue = 0;
    let dueToday = 0;
    let inProgress = 0;

    tasks.forEach((t) => {
      if ((t.status === "todo" || t.status === "in_progress") && t.due_date) {
        const dd = new Date(t.due_date);
        if (dd < todayStart) overdue++;
        else if (dd >= todayStart && dd <= todayEnd) dueToday++;
      }
      if (t.status === "in_progress") inProgress++;
    });

    return { overdue, dueToday, inProgress, total: tasks.length };
  }, [tasks]);

  // Initialize form values when mode changes
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

  const handleToggle = async (id: string, done: boolean) => {
    const newStatus = done ? "done" : "todo";
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t)));
    const res = await fetch(`/api/crm/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) {
      toast.error("Failed to update task");
      fetchTasks();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this task?")) return;
    const res = await fetch(`/api/crm/tasks/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      toast.success("Task deleted");
      setTasks((prev) => prev.filter((t) => t.id !== id));
      setTotal((prev) => prev - 1);
    } else {
      toast.error(json.error || "Failed to delete task");
    }
  };

  const handleBulkDelete = async () => {
    setIsBulkLoading(true);
    try {
      const res = await fetch("/api/crm/tasks/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", ids: selectedIds }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Deleted ${selectedIds.length} task${selectedIds.length !== 1 ? "s" : ""}`);
        deselectAll();
        fetchTasks();
      } else {
        toast.error(json.error || "Failed to delete tasks");
      }
    } finally {
      setIsBulkLoading(false);
      setConfirmDelete(false);
    }
  };

  const handleBulkStatusChange = async (status: string) => {
    setIsBulkLoading(true);
    try {
      const res = await fetch("/api/crm/tasks/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_status", ids: selectedIds, status }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Updated ${selectedIds.length} task${selectedIds.length !== 1 ? "s" : ""} to ${status}`);
        deselectAll();
        fetchTasks();
      } else {
        toast.error(json.error || "Failed to update tasks");
      }
    } finally {
      setIsBulkLoading(false);
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
      if (Object.keys(metadata).length > 0) {
        payload.metadata = metadata;
      }

      const isEdit = formMode.type === "edit";
      const url = isEdit ? `/api/crm/tasks/${formMode.task.id}` : "/api/crm/tasks";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
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

  const isEdit = formMode.type === "edit";
  const selectedType = formValues.type || "";
  const ctxField = contextFields[selectedType];
  const visibleIds = filteredTasks.map((t) => t.id);
  const allSelected = isAllSelected(visibleIds);

  return (
    <PageContainer>
      <PageHeader title="Tasks" description={`${total} task${total !== 1 ? "s" : ""}`}>
        <Button size="sm" onClick={() => setFormMode({ type: "create" })}>
          <Plus className="size-4 mr-1" />
          New Task
        </Button>
      </PageHeader>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <Card className={cn("glass-card", stats.overdue > 0 && "border-red-500/30")}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", stats.overdue > 0 ? "bg-red-500/10" : "bg-muted")}>
                <AlertTriangle className={cn("w-4 h-4", stats.overdue > 0 ? "text-red-500" : "text-muted-foreground")} />
              </div>
              <div>
                <p className="text-lg font-bold">{stats.overdue}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Overdue</p>
              </div>
            </CardContent>
          </Card>
        </div>
        <div>
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/10">
                <CalendarDays className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <p className="text-lg font-bold">{stats.dueToday}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Due Today</p>
              </div>
            </CardContent>
          </Card>
        </div>
        <div>
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-500/10">
                <Clock className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <p className="text-lg font-bold">{stats.inProgress}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">In Progress</p>
              </div>
            </CardContent>
          </Card>
        </div>
        <div>
          <Card className="glass-card">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/10">
                <CheckSquare className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-lg font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className={showFilters ? "bg-muted" : ""}>
              <ListFilter className="size-4 mr-1" />
              Filters
              {(priorityFilter || typeFilter) && <Badge className="ml-2 h-4 px-1 text-xs">!</Badge>}
            </Button>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="flex h-9 rounded-md border border-input bg-transparent px-4 py-1 text-sm shadow-xs transition-colors hover:border-ring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
              aria-label="Sort tasks by"
            >
              {sortOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Status filter */}
        <div className="flex gap-1">
          {statusFilters.map((f) => (
            <Badge
              key={f.value}
              variant={statusFilter === f.value ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
            </Badge>
          ))}
        </div>

        {/* Advanced filters */}
        {showFilters && (
          <div className="flex flex-wrap gap-4">
            <div className="flex gap-1">
              <span className="text-xs text-muted-foreground self-center mr-1">Priority:</span>
              {priorityFilters.map((f) => (
                <Badge
                  key={f.value}
                  variant={priorityFilter === f.value ? "default" : "outline"}
                  className={cn("cursor-pointer", f.color && priorityFilter !== f.value && f.color)}
                  onClick={() => setPriorityFilter(f.value)}
                >
                  {f.label}
                </Badge>
              ))}
            </div>
            <div className="flex gap-1">
              <span className="text-xs text-muted-foreground self-center mr-1">Type:</span>
              {typeFilters.map((f) => (
                <Badge
                  key={f.value}
                  variant={typeFilter === f.value ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setTypeFilter(f.value)}
                >
                  {f.label}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title={search || priorityFilter || typeFilter ? "No matching tasks" : "No tasks"}
          description={search || priorityFilter || typeFilter ? "Try adjusting your filters." : "Create a task to stay on top of your follow-ups."}
        />
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-4 py-1">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={allSelected}
                onCheckedChange={() => allSelected ? deselectAll() : selectAll(visibleIds)}
                className="size-5"
              />
              <span className="text-sm text-muted-foreground">Select all</span>
            </div>
            <span className="text-xs text-muted-foreground">{filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}</span>
          </div>
          {filteredTasks.map((task) => (
            <TaskItem
              key={task.id}
              id={task.id}
              title={task.title}
              type={task.type}
              priority={task.priority}
              status={task.status}
              dueDate={task.due_date}
              isAiGenerated={task.is_ai_generated}
              onToggle={handleToggle}
              onEdit={(id) => {
                const t = tasks.find((x) => x.id === id);
                if (t) setFormMode({ type: "edit", task: t });
              }}
              onDelete={handleDelete}
              selectable={selectable}
              selected={isSelected(task.id)}
              onSelectToggle={toggle}
            />
          ))}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={isLoadingMore}
                onClick={() => fetchTasks(tasks.length, true)}
              >
                {isLoadingMore && <Loader2 className="size-4 mr-2 animate-spin" />}
                Load More ({tasks.length} of {total})
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Task form dialog */}
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
              <Input
                value={formValues.title || ""}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Follow up with..."
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={formValues.description || ""}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Details..."
                rows={3}
              />
            </div>

            {isEdit && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <select
                  value={formValues.status || "todo"}
                  onChange={(e) => set("status", e.target.value)}
                  className={selectClass}
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <select
                value={formValues.type || ""}
                onChange={(e) => set("type", e.target.value)}
                className={selectClass}
              >
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
                <Input
                  type={ctxField.inputType}
                  value={formValues[ctxField.name] || ""}
                  onChange={(e) => set(ctxField.name, e.target.value)}
                  placeholder={ctxField.placeholder}
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <select
                value={formValues.priority || ""}
                onChange={(e) => set("priority", e.target.value)}
                className={selectClass}
              >
                <option value="">Select...</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Due Date</label>
              <Input
                type="date"
                value={formValues.due_date || ""}
                onChange={(e) => set("due_date", e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormMode({ type: "closed" })}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="size-4 mr-2 animate-spin" />}
                {isEdit ? "Save" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <BulkActionBar
        selectedCount={count}
        onDeselectAll={deselectAll}
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
        title="Delete tasks"
        description={`Are you sure you want to delete ${count} task${count !== 1 ? "s" : ""}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        isLoading={isBulkLoading}
        onConfirm={handleBulkDelete}
      />
    </PageContainer>
  );
}
