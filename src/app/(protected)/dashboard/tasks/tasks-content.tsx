"use client";

import { useState, useEffect, useCallback } from "react";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TaskItem } from "@/components/crm/task-item";
import { EmptyState } from "@/components/crm/empty-state";
import { BulkActionBar } from "@/components/crm/bulk-action-bar";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import { useMultiSelect } from "@/hooks/use-multi-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, CheckSquare, Loader2, Phone, Mail, MapPin } from "lucide-react";
import { toast } from "sonner";

const statusFilters = [
  { label: "All", value: "" },
  { label: "To Do", value: "todo" },
  { label: "In Progress", value: "in_progress" },
  { label: "Done", value: "done" },
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
}

type FormMode = { type: "closed" } | { type: "create" } | { type: "edit"; task: TaskData };

const contextFields: Record<string, { name: string; label: string; inputType: string; icon: typeof Phone; placeholder: string }> = {
  call: { name: "phone_number", label: "Phone Number", inputType: "tel", icon: Phone, placeholder: "+1 (555) 000-0000" },
  email: { name: "email_address", label: "Email Address", inputType: "email", icon: Mail, placeholder: "email@example.com" },
  meeting: { name: "location", label: "Location", inputType: "text", icon: MapPin, placeholder: "Office, Zoom link, etc." },
};

const selectClass = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function TasksContent() {
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [formMode, setFormMode] = useState<FormMode>({ type: "closed" });
  const [total, setTotal] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { selectedIds, toggle, selectAll, deselectAll, isSelected, isAllSelected, count } = useMultiSelect();

  const selectable = count > 0;

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/crm/tasks?${params}`);
      const json = await res.json();
      if (json.success) {
        setTasks(json.data);
        setTotal(json.total || 0);
      }
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // Reset selection when filters change
  useEffect(() => {
    deselectAll();
  }, [statusFilter, deselectAll]);

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
      // Build metadata from contextual fields
      const metadata: Record<string, string> = {};
      const metaKeys = ["phone_number", "email_address", "location"];
      for (const key of metaKeys) {
        if (formValues[key]) metadata[key] = formValues[key];
      }

      // Build payload, filtering empty strings
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
  const visibleIds = tasks.map((t) => t.id);
  const allSelected = isAllSelected(visibleIds);

  return (
    <PageContainer>
      <PageHeader title="Tasks" description={`${total} task${total !== 1 ? "s" : ""}`}>
        <Button size="sm" onClick={() => setFormMode({ type: "create" })}>
          <Plus className="size-4 mr-1" />
          New Task
        </Button>
      </PageHeader>

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

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No tasks"
          description="Create a task to stay on top of your follow-ups."
        />
      ) : (
        <div className="space-y-2">
          {/* Select All */}
          <div className="flex items-center gap-2 px-3 py-1">
            <Checkbox
              checked={allSelected}
              onCheckedChange={() => allSelected ? deselectAll() : selectAll(visibleIds)}
              className="size-5"
            />
            <span className="text-sm text-muted-foreground">Select all</span>
          </div>
          {tasks.map((task) => (
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
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={formValues.title || ""}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Follow up with..."
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={formValues.description || ""}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Details..."
                rows={3}
              />
            </div>

            {/* Status — only in edit mode */}
            {isEdit && (
              <div className="space-y-1.5">
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

            <div className="space-y-1.5">
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

            {/* Contextual field: phone for call, email for email, location for meeting */}
            {ctxField && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5">
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

            <div className="space-y-1.5">
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

            <div className="space-y-1.5">
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
