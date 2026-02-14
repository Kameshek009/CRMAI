"use client";

import { useState, useEffect, useCallback } from "react";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskItem } from "@/components/crm/task-item";
import { EntityForm, type FormField } from "@/components/crm/entity-form";
import { EmptyState } from "@/components/crm/empty-state";
import { Plus, CheckSquare } from "lucide-react";
import { toast } from "sonner";

const statusFilters = [
  { label: "All", value: "" },
  { label: "To Do", value: "todo" },
  { label: "In Progress", value: "in_progress" },
  { label: "Done", value: "done" },
];

const taskFields: FormField[] = [
  { name: "title", label: "Title", type: "text", required: true, placeholder: "Follow up with..." },
  { name: "description", label: "Description", type: "textarea", placeholder: "Details..." },
  {
    name: "type", label: "Type", type: "select",
    options: [
      { label: "Call", value: "call" },
      { label: "Email", value: "email" },
      { label: "Meeting", value: "meeting" },
      { label: "Follow Up", value: "follow_up" },
      { label: "Other", value: "other" },
    ],
  },
  {
    name: "priority", label: "Priority", type: "select",
    options: [
      { label: "Low", value: "low" },
      { label: "Medium", value: "medium" },
      { label: "High", value: "high" },
      { label: "Urgent", value: "urgent" },
    ],
  },
  { name: "due_date", label: "Due Date", type: "date" },
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
}

export function TasksContent() {
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskData | null>(null);
  const [total, setTotal] = useState(0);

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

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

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

  const handleEdit = (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (task) {
      setEditingTask(task);
    }
  };

  const handleUpdate = async (values: Record<string, string>) => {
    if (!editingTask) return;
    const filtered = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v !== "")
    );
    const res = await fetch(`/api/crm/tasks/${editingTask.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(filtered),
    });
    const json = await res.json();
    if (json.success) {
      toast.success("Task updated");
      fetchTasks();
    } else {
      toast.error(json.error || "Failed to update task");
      throw new Error(json.error);
    }
  };

  const handleCreate = async (values: Record<string, string>) => {
    // Filter out empty strings so Zod enum validation doesn't fail on unselected fields
    const filtered = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v !== "")
    );
    const res = await fetch("/api/crm/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(filtered),
    });
    const json = await res.json();
    if (json.success) {
      toast.success("Task created");
      fetchTasks();
    } else {
      toast.error(json.error || "Failed");
      throw new Error(json.error);
    }
  };

  return (
    <PageContainer>
      <PageHeader title="Tasks" description={`${total} task${total !== 1 ? "s" : ""}`}>
        <Button size="sm" onClick={() => setShowForm(true)}>
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
          actionLabel="Add Task"
          onAction={() => setShowForm(true)}
        />
      ) : (
        <div className="space-y-2">
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
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <EntityForm
        open={showForm}
        onOpenChange={setShowForm}
        title="New Task"
        fields={taskFields}
        onSubmit={handleCreate}
      />

      <EntityForm
        open={!!editingTask}
        onOpenChange={(open) => { if (!open) setEditingTask(null); }}
        title="Edit Task"
        fields={taskFields}
        initialValues={editingTask ? {
          title: editingTask.title,
          description: editingTask.description || "",
          type: editingTask.type || "",
          priority: editingTask.priority || "",
          due_date: editingTask.due_date || "",
        } : {}}
        onSubmit={handleUpdate}
        submitLabel="Save"
      />
    </PageContainer>
  );
}
