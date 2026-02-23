"use client";

import { cn } from "@/lib/utils";
import { Search, SlidersHorizontal, ArrowUpDown, Download, Plus, X, Sparkles } from "lucide-react";
import { useState, useCallback, useEffect, useRef } from "react";
import { ViewModeSwitcher } from "./view-mode-switcher";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import type { ViewMode } from "@/types/crm";
import type { FeatureLimitKey } from "@/types";
import { useFeatureLimitStore } from "@/stores/feature-limit-store";
import { useTranslation } from "@/lib/i18n";

// ============================================================================
// Types
// ============================================================================

export interface FilterOption {
  field: string;
  label: string;
  type: "select" | "text" | "date";
  options?: { value: string; label: string }[];
}

export interface ActiveFilter {
  field: string;
  value: string;
  label: string;
}

export interface SortOption {
  field: string;
  label: string;
}

export interface GroupByOption {
  field: string;
  label: string;
}

interface ViewControlsProps {
  // Search
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;

  // View mode
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;

  // Filters
  filterOptions?: FilterOption[];
  activeFilters?: ActiveFilter[];
  onFilterAdd?: (field: string, value: string) => void;
  onFilterRemove?: (field: string) => void;
  onFiltersClear?: () => void;

  // Sort
  sortOptions?: SortOption[];
  currentSort?: string;
  sortOrder?: "asc" | "desc";
  onSortChange?: (field: string, order: "asc" | "desc") => void;

  // Group By
  groupByOptions?: GroupByOption[];
  currentGroupBy?: string | null;
  onGroupByChange?: (field: string | null) => void;

  // Actions
  onExport?: () => void;
  onAdd?: () => void;
  addLabel?: string;

  // Feature limits
  featureLimitKey?: FeatureLimitKey;

  // Count
  totalCount?: number;
  entityName?: string;

  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function ViewControls({
  search,
  onSearchChange,
  searchPlaceholder = "Search...",
  viewMode,
  onViewModeChange,
  filterOptions = [],
  activeFilters = [],
  onFilterAdd,
  onFilterRemove,
  onFiltersClear,
  sortOptions = [],
  currentSort,
  sortOrder = "desc",
  onSortChange,
  groupByOptions = [],
  currentGroupBy,
  onGroupByChange,
  onExport,
  onAdd,
  addLabel = "Add New",
  featureLimitKey,
  totalCount,
  entityName,
  className,
}: ViewControlsProps) {
  const { t } = useTranslation();
  const [searchFocused, setSearchFocused] = useState(false);
  const [localSearch, setLocalSearch] = useState(search);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Sync external search value → local (e.g. when cleared externally)
  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  // Debounce search callback (300ms)
  const handleSearchInput = useCallback(
    (value: string) => {
      setLocalSearch(value);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onSearchChange(value);
      }, 300);
    },
    [onSearchChange]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  // Feature limit pre-check
  const limitStore = useFeatureLimitStore();
  const nearLimit = featureLimitKey ? limitStore.isNearLimit(featureLimitKey) : false;
  const atLimit = featureLimitKey ? limitStore.isAtLimit(featureLimitKey) : false;
  const usageInfo = featureLimitKey ? limitStore.getUsageInfo(featureLimitKey) : null;

  const handleSortClick = useCallback(
    (field: string) => {
      if (!onSortChange) return;
      if (currentSort === field) {
        onSortChange(field, sortOrder === "asc" ? "desc" : "asc");
      } else {
        onSortChange(field, "desc");
      }
    },
    [currentSort, sortOrder, onSortChange]
  );

  return (
    <div className={cn("space-y-2", className)}>
      {/* Main toolbar row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div
          className={cn(
            "relative flex items-center rounded-lg border bg-background transition-colors",
            searchFocused ? "border-foreground/30 ring-1 ring-foreground/10" : "border-border"
          )}
        >
          <Search className="ml-2.5 h-4 w-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => handleSearchInput(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder={searchPlaceholder}
            className="h-8 w-48 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground"
          />
          {localSearch && (
            <button
              type="button"
              onClick={() => { setLocalSearch(""); clearTimeout(debounceRef.current); onSearchChange(""); }}
              className="mr-1.5 rounded p-0.5 hover:bg-muted"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Filter dropdown */}
        {filterOptions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span>{t("crm.viewControls.filter")}</span>
                {activeFilters.length > 0 && (
                  <span className="ml-1 rounded-full bg-foreground text-background px-1.5 py-0.5 text-[10px] font-semibold leading-none">
                    {activeFilters.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>{t("crm.viewControls.filterBy")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {filterOptions.map((filter) => {
                if (filter.type === "select" && filter.options) {
                  return filter.options.map((opt) => (
                    <DropdownMenuItem
                      key={`${filter.field}-${opt.value}`}
                      onClick={() => onFilterAdd?.(filter.field, opt.value)}
                    >
                      <span className="text-muted-foreground mr-2 text-xs">{filter.label}:</span>
                      {opt.label}
                    </DropdownMenuItem>
                  ));
                }
                return null;
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Sort dropdown */}
        {sortOptions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5">
                <ArrowUpDown className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span>{t("crm.viewControls.sort")}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel>{t("crm.viewControls.sortBy")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {sortOptions.map((opt) => (
                <DropdownMenuItem
                  key={opt.field}
                  onClick={() => handleSortClick(opt.field)}
                >
                  <span className={cn(currentSort === opt.field && "font-semibold")}>
                    {opt.label}
                  </span>
                  {currentSort === opt.field && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {sortOrder === "asc" ? t("crm.viewControls.asc") : t("crm.viewControls.desc")}
                    </span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Group By dropdown (only shown in group_by mode) */}
        {groupByOptions.length > 0 && viewMode === "group_by" && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5">
                <span>{t("crm.viewControls.groupBy")}: {currentGroupBy ? groupByOptions.find(o => o.field === currentGroupBy)?.label || currentGroupBy : t("crm.viewControls.none")}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel>{t("crm.viewControls.groupBy")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {groupByOptions.map((opt) => (
                <DropdownMenuItem
                  key={opt.field}
                  onClick={() => onGroupByChange?.(opt.field === currentGroupBy ? null : opt.field)}
                >
                  <span className={cn(currentGroupBy === opt.field && "font-semibold")}>
                    {opt.label}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Count */}
        {totalCount !== undefined && entityName && (
          <span className="text-sm text-muted-foreground">
            {totalCount} {entityName}
          </span>
        )}

        {/* View mode switcher */}
        <ViewModeSwitcher mode={viewMode} onChange={onViewModeChange} />

        {/* Export */}
        {onExport && (
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={onExport}>
            <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span className="hidden sm:inline">{t("crm.viewControls.export")}</span>
          </Button>
        )}

        {/* Add / Upgrade */}
        {onAdd && (
          <>
            {featureLimitKey && nearLimit && !atLimit && usageInfo && usageInfo.limit > 0 && (
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                {usageInfo.current}/{usageInfo.limit}
              </span>
            )}
            {atLimit && usageInfo && usageInfo.limit > 0 ? (
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950"
                onClick={() =>
                  limitStore.showUpgradeModal(
                    featureLimitKey!,
                    usageInfo.current,
                    usageInfo.limit
                  )
                }
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{t("crm.viewControls.upgradeToAdd")}</span>
              </Button>
            ) : (
              <Button size="sm" className="h-8 gap-1.5" onClick={onAdd}>
                <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span>{addLabel}</span>
              </Button>
            )}
          </>
        )}
      </div>

      {/* Active filters */}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {activeFilters.map((filter) => (
            <span
              key={filter.field}
              className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs"
            >
              <span className="text-muted-foreground">{filter.field}:</span>
              <span className="font-medium">{filter.label}</span>
              <button
                type="button"
                onClick={() => onFilterRemove?.(filter.field)}
                className="ml-0.5 rounded hover:bg-foreground/10"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {activeFilters.length > 1 && (
            <button
              type="button"
              onClick={onFiltersClear}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {t("crm.viewControls.clearAll")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
