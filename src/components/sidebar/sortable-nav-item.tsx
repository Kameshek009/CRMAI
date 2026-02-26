"use client";

import { memo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import type { LucideIcon } from "lucide-react";

interface SortableNavItemProps {
  id: string;
  labelKey: string;
  icon: LucideIcon;
  visible: boolean;
  onToggleVisibility: () => void;
}

export const SortableNavItem = memo(function SortableNavItem({ id, labelKey, icon: Icon, visible, onToggleVisibility }: SortableNavItemProps) {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm select-none",
        isDragging && "opacity-50 bg-muted",
        !visible && "opacity-40"
      )}
    >
      <button
        className="cursor-grab active:cursor-grabbing touch-none p-0.5 text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3.5" />
      </button>
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className={cn("flex-1 truncate", !visible && "line-through")}>{t(labelKey)}</span>
      <button
        onClick={onToggleVisibility}
        className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
      >
        {visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
      </button>
    </div>
  );
});
