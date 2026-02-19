"use client";

import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useCallback, useMemo } from "react";
import { useTranslation } from "@/lib/i18n";

// ============================================================================
// Types
// ============================================================================

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: "left" | "center" | "right";
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T extends { id: string }> {
  columns: Column<T>[];
  data: T[];
  // Sort
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (field: string, order: "asc" | "desc") => void;
  // Selection
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  // Row click
  onRowClick?: (item: T) => void;
  // Pagination
  page?: number;
  pageSize?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
  // State
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function DataTable<T extends { id: string }>({
  columns,
  data,
  sortBy,
  sortOrder = "desc",
  onSort,
  selectable = false,
  selectedIds = new Set(),
  onSelectionChange,
  onRowClick,
  page = 1,
  pageSize = 50,
  totalCount,
  onPageChange,
  loading = false,
  emptyMessage,
  className,
}: DataTableProps<T>) {
  const { t } = useTranslation();
  const resolvedEmptyMessage = emptyMessage || t("crm.dataTable.noData");
  const allSelected = useMemo(
    () => data.length > 0 && data.every((item) => selectedIds.has(item.id)),
    [data, selectedIds]
  );

  const handleSelectAll = useCallback(() => {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(data.map((item) => item.id)));
    }
  }, [allSelected, data, onSelectionChange]);

  const handleSelectRow = useCallback(
    (id: string) => {
      if (!onSelectionChange) return;
      const next = new Set(selectedIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      onSelectionChange(next);
    },
    [selectedIds, onSelectionChange]
  );

  const handleSort = useCallback(
    (field: string) => {
      if (!onSort) return;
      if (sortBy === field) {
        onSort(field, sortOrder === "asc" ? "desc" : "asc");
      } else {
        onSort(field, "desc");
      }
    },
    [sortBy, sortOrder, onSort]
  );

  const total = totalCount ?? data.length;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className={cn("rounded-lg border border-border overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          {/* Header */}
          <thead>
            <tr className="border-b border-border bg-muted/50">
              {selectable && (
                <th className="w-10 px-3 py-2">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-3 py-2 text-xs font-medium text-muted-foreground",
                    col.align === "center" && "text-center",
                    col.align === "right" && "text-right",
                    col.sortable && "cursor-pointer select-none hover:text-foreground"
                  )}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      <span className="text-muted-foreground/50">
                        {sortBy === col.key ? (
                          sortOrder === "asc" ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-3 w-3" />
                        )}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  {selectable && <td className="px-3 py-3"><div className="h-4 w-4 rounded bg-muted animate-pulse" /></td>}
                  {columns.map((col) => (
                    <td key={col.key} className="px-3 py-3">
                      <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-3 py-16 text-center text-sm text-muted-foreground"
                >
                  {resolvedEmptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr
                  key={item.id}
                  className={cn(
                    "border-b border-border last:border-0 transition-colors",
                    selectedIds.has(item.id) && "bg-muted/50",
                    onRowClick && "cursor-pointer hover:bg-muted/30"
                  )}
                  onClick={() => onRowClick?.(item)}
                >
                  {selectable && (
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(item.id)}
                        onCheckedChange={() => handleSelectRow(item.id)}
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-3 py-2.5 text-sm",
                        col.align === "center" && "text-center",
                        col.align === "right" && "text-right"
                      )}
                    >
                      {col.render
                        ? col.render(item)
                        : (item as Record<string, unknown>)[col.key] != null
                          ? String((item as Record<string, unknown>)[col.key])
                          : "—"}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border px-4 py-2">
          <span className="text-xs text-muted-foreground">
            {t("crm.dataTable.showing", { start: (page - 1) * pageSize + 1, end: Math.min(page * pageSize, total), total })}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange?.(page - 1)}
              className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50"
            >
              {t("crm.dataTable.previous")}
            </button>
            <span className="px-2 text-xs font-medium">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange?.(page + 1)}
              className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50"
            >
              {t("crm.dataTable.next")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
