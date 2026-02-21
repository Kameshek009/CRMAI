"use client";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { DollarSign, TrendingUp, Search, LayoutGrid, SlidersHorizontal, X } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export interface PipelineFilterOption {
  field: string;
  label: string;
  options: { value: string; label: string }[];
}

export interface PipelineActiveFilter {
  field: string;
  value: string;
  label: string;
}

interface PipelineToolbarProps {
  totalValue: number;
  weightedForecast: number;
  search: string;
  onSearchChange: (value: string) => void;
  dealCount: number;
  filterOptions?: PipelineFilterOption[];
  activeFilters?: PipelineActiveFilter[];
  onFilterAdd?: (field: string, value: string) => void;
  onFilterRemove?: (field: string) => void;
}

export function PipelineToolbar({
  totalValue,
  weightedForecast,
  search,
  onSearchChange,
  dealCount,
  filterOptions = [],
  activeFilters = [],
  onFilterAdd,
  onFilterRemove,
}: PipelineToolbarProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-0 border-b bg-background/80 backdrop-blur-xl shrink-0 header-shimmer">
      <div className="flex items-center justify-between gap-4 px-4 py-2.5">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <LayoutGrid className="size-5 text-primary" />
            <h1 className="text-lg font-bold tracking-tight">{t("crm.pipeline.pageTitle")}</h1>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-sm">
            <Badge variant="outline" className="flex items-center gap-1 font-medium px-2.5 py-1 text-muted-foreground">
              <LayoutGrid className="size-3" />
              {t("crm.pipeline.totalDeals", { count: dealCount })}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1 font-semibold px-2.5 py-1 bg-emerald-500/5 text-emerald-600 border-emerald-200/50 dark:border-emerald-800/30">
              <DollarSign className="size-3.5" />
              {totalValue.toLocaleString()}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1 font-medium px-2.5 py-1 text-muted-foreground">
              <TrendingUp className="size-3.5" />
              ${weightedForecast.toLocaleString()} {t("crm.pipeline.forecast")}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {filterOptions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                  <SlidersHorizontal className="size-3.5" />
                  {t("crm.pipeline.filters.title")}
                  {activeFilters.length > 0 && (
                    <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px]">
                      {activeFilters.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {filterOptions.map((filter) => (
                  <div key={filter.field}>
                    <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                      {filter.label}
                    </DropdownMenuLabel>
                    {filter.options.map((opt) => {
                      const isActive = activeFilters.some((f) => f.field === filter.field && f.value === opt.value);
                      return (
                        <DropdownMenuItem
                          key={opt.value}
                          onClick={() => {
                            if (isActive) {
                              onFilterRemove?.(filter.field);
                            } else {
                              onFilterAdd?.(filter.field, opt.value);
                            }
                          }}
                          className={isActive ? "bg-primary/10 text-primary" : ""}
                        >
                          {opt.label}
                        </DropdownMenuItem>
                      );
                    })}
                    <DropdownMenuSeparator />
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t("crm.pipeline.searchDeals")}
              className="h-8 w-48 pl-8 text-sm glass-input rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-1.5 px-4 pb-2">
          {activeFilters.map((f) => (
            <Badge
              key={f.field}
              variant="secondary"
              className="gap-1 pr-1 text-xs font-normal"
            >
              {f.label}
              <button
                onClick={() => onFilterRemove?.(f.field)}
                className="ml-0.5 hover:bg-muted rounded-sm p-0.5"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
          <button
            onClick={() => activeFilters.forEach((f) => onFilterRemove?.(f.field))}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-1"
          >
            {t("crm.pipeline.filters.clearAll")}
          </button>
        </div>
      )}
    </div>
  );
}
