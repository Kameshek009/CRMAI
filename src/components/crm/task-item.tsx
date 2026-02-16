"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Calendar, Pencil, Trash2, Clock } from "lucide-react";

interface TaskItemProps {
  id: string;
  title: string;
  type: string;
  priority: string;
  status: string;
  dueDate?: string | null;
  isAiGenerated: boolean;
  onToggle?: (id: string, done: boolean) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  selectable?: boolean;
  selected?: boolean;
  onSelectToggle?: (id: string) => void;
}

const priorityConfig: Record<string, { color: string; badge: string; dot: string }> = {
  urgent: { color: "border-red-200 dark:border-red-900/40", badge: "bg-red-500/10 text-red-600 border-red-200 dark:border-red-800/40", dot: "bg-red-500" },
  high: { color: "border-orange-200 dark:border-orange-900/40", badge: "bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-800/40", dot: "bg-orange-500" },
  medium: { color: "border-blue-200 dark:border-blue-900/40", badge: "bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800/40", dot: "bg-blue-500" },
  low: { color: "border-gray-200 dark:border-gray-800", badge: "bg-gray-500/10 text-gray-600 border-gray-200 dark:border-gray-800", dot: "bg-gray-400" },
};

export function TaskItem({
  id,
  title,
  type,
  priority,
  status,
  dueDate,
  isAiGenerated,
  onToggle,
  onEdit,
  onDelete,
  selectable,
  selected,
  onSelectToggle,
}: TaskItemProps) {
  const isDone = status === "done";
  const isInProgress = status === "in_progress";
  const isOverdue = dueDate && new Date(dueDate) < new Date() && !isDone;
  const config = priorityConfig[priority] || priorityConfig.medium;

  return (
    <div className={cn(
      "premium-card flex items-center gap-3 rounded-xl border p-3.5 bg-card group/task",
      isDone && "opacity-50",
      isInProgress && "border-blue-200/60 bg-blue-50/30 dark:border-blue-800/30 dark:bg-blue-950/10",
      isOverdue && !isInProgress && "border-red-200/60 bg-red-50/30 dark:border-red-900/20 dark:bg-red-950/10",
      selected && "ring-2 ring-primary/40 bg-primary/5 shadow-md"
    )}>
      {/* Priority indicator line */}
      <div className={cn("w-1 self-stretch rounded-full -ml-1 shrink-0", config.dot, isDone && "opacity-30")} />

      {selectable ? (
        <Checkbox
          checked={selected}
          onCheckedChange={() => onSelectToggle?.(id)}
          className="size-5 premium-checkbox"
        />
      ) : (
        <Checkbox
          checked={isDone}
          onCheckedChange={(checked) => onToggle?.(id, !!checked)}
          className="size-5 premium-checkbox"
        />
      )}
      <div className="flex-1 min-w-0 relative z-[1]">
        <div className="flex items-center gap-2">
          <span className={cn("text-sm font-medium truncate", isDone && "line-through text-muted-foreground")}>{title}</span>
          {isInProgress && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800/40 badge-shimmer">
              <Clock className="size-2.5 mr-0.5" />
              In Progress
            </Badge>
          )}
          {isAiGenerated && (
            <Sparkles className="size-3 text-purple-500 shrink-0 animate-pulse-glow" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", config.badge)}>
            {priority}
          </Badge>
          <span className="text-[11px] text-muted-foreground capitalize">{type.replace("_", " ")}</span>
          {dueDate && (
            <span className={cn(
              "flex items-center gap-1 text-[11px]",
              isOverdue ? "text-red-600 font-semibold" : "text-muted-foreground"
            )}>
              <Calendar className="size-3" />
              {new Date(dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              {isOverdue && <span className="text-[9px] uppercase tracking-wide ml-0.5">overdue</span>}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover/task:opacity-100 transition-opacity">
        {onEdit && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-foreground hover:bg-muted/80"
            onClick={() => onEdit(id)}
          >
            <Pencil className="size-3.5" />
          </Button>
        )}
        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(id)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
