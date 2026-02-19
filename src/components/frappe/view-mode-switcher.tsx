"use client";

import { cn } from "@/lib/utils";
import { LayoutList, Kanban, Group } from "lucide-react";
import type { ViewMode } from "@/types/crm";

interface ViewModeSwitcherProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
  className?: string;
}

const modes: { value: ViewMode; icon: typeof LayoutList; label: string }[] = [
  { value: "table", icon: LayoutList, label: "Table" },
  { value: "kanban", icon: Kanban, label: "Kanban" },
  { value: "group_by", icon: Group, label: "Group By" },
];

export function ViewModeSwitcher({ mode, onChange, className }: ViewModeSwitcherProps) {
  return (
    <div className={cn("inline-flex items-center rounded-lg border border-border bg-muted p-0.5", className)}>
      {modes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            mode === value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
          title={label}
        >
          <Icon className="h-4 w-4" strokeWidth={1.5} />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
