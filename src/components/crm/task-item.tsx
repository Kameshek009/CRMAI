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

const priorityColors: Record<string, string> = {
  urgent: "bg-red-500/10 text-red-600 border-red-200",
  high: "bg-orange-500/10 text-orange-600 border-orange-200",
  medium: "bg-blue-500/10 text-blue-600 border-blue-200",
  low: "bg-gray-500/10 text-gray-600 border-gray-200",
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

  return (
    <div className={cn(
      "flex items-center gap-3 rounded-lg border p-3 transition-colors",
      isDone && "opacity-60",
      isInProgress && "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/10",
      isOverdue && "border-red-200 bg-red-50/50 dark:bg-red-950/10",
      selected && "ring-2 ring-primary/50 bg-primary/5"
    )}>
      {selectable ? (
        <Checkbox
          checked={selected}
          onCheckedChange={() => onSelectToggle?.(id)}
          className="size-5"
        />
      ) : (
        <Checkbox
          checked={isDone}
          onCheckedChange={(checked) => onToggle?.(id, !!checked)}
          className="size-5"
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn("text-sm font-medium", isDone && "line-through")}>{title}</span>
          {isInProgress && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-500/10 text-blue-600 border-blue-200">
              <Clock className="size-2.5 mr-0.5" />
              In Progress
            </Badge>
          )}
          {isAiGenerated && (
            <Sparkles className="size-3 text-purple-500" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className={cn("text-xs", priorityColors[priority])}>
            {priority}
          </Badge>
          <span className="text-xs text-muted-foreground capitalize">{type.replace("_", " ")}</span>
          {dueDate && (
            <span className={cn(
              "flex items-center gap-1 text-xs",
              isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"
            )}>
              <Calendar className="size-3" />
              {new Date(dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              {isOverdue && " (overdue)"}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {onEdit && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(id)}
          >
            <Pencil className="size-3.5" />
          </Button>
        )}
        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(id)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
