"use client";

import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState, useMemo, useCallback } from "react";

// ============================================================================
// Types
// ============================================================================

export interface GroupByGroup<T> {
  key: string;
  label: string;
  count: number;
  items: T[];
}

interface GroupByViewProps<T extends { id: string }> {
  groups: GroupByGroup<T>[];
  renderItem: (item: T) => React.ReactNode;
  renderGroupHeader?: (group: GroupByGroup<T>) => React.ReactNode;
  emptyMessage?: string;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function GroupByView<T extends { id: string }>({
  groups,
  renderItem,
  renderGroupHeader,
  emptyMessage = "No data found",
  className,
}: GroupByViewProps<T>) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggleGroup = useCallback((key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const totalItems = useMemo(
    () => groups.reduce((sum, g) => sum + g.items.length, 0),
    [groups]
  );

  if (totalItems === 0) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {groups.map((group) => {
        const isCollapsed = collapsed.has(group.key);

        return (
          <div key={group.key} className="rounded-lg border border-border overflow-hidden">
            {/* Group header */}
            <button
              type="button"
              onClick={() => toggleGroup(group.key)}
              className="flex w-full items-center gap-2 bg-muted/50 px-4 py-2.5 text-left transition-colors hover:bg-muted"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              {renderGroupHeader ? (
                renderGroupHeader(group)
              ) : (
                <>
                  <span className="text-sm font-medium">{group.label}</span>
                  <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-xs text-muted-foreground">
                    {group.count}
                  </span>
                </>
              )}
            </button>

            {/* Group content */}
            {!isCollapsed && (
              <div className="divide-y divide-border">
                {group.items.map((item) => (
                  <div key={item.id}>{renderItem(item)}</div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
