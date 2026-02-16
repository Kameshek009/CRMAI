"use client";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PipelineZoomControls } from "./pipeline-zoom-controls";
import { DollarSign, TrendingUp, Search } from "lucide-react";

interface PipelineToolbarProps {
  totalValue: number;
  weightedForecast: number;
  search: string;
  onSearchChange: (value: string) => void;
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onReset: () => void;
}

export function PipelineToolbar({
  totalValue,
  weightedForecast,
  search,
  onSearchChange,
  scale,
  onZoomIn,
  onZoomOut,
  onFit,
  onReset,
}: PipelineToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5 border-b bg-background/80 backdrop-blur-xl shrink-0 header-shimmer">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold tracking-tight">Pipeline</h1>
        <div className="flex items-center gap-3 text-sm">
          <Badge variant="outline" className="flex items-center gap-1 font-semibold px-2.5 py-1 bg-emerald-500/5 text-emerald-600 border-emerald-200/50 dark:border-emerald-800/30">
            <DollarSign className="size-3.5" />
            {totalValue.toLocaleString()}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1 font-medium px-2.5 py-1 text-muted-foreground">
            <TrendingUp className="size-3.5" />
            ${weightedForecast.toLocaleString()} forecast
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search deals..."
            className="h-8 w-48 pl-8 text-sm glass-input rounded-lg"
          />
        </div>
        <PipelineZoomControls
          scale={scale}
          onZoomIn={onZoomIn}
          onZoomOut={onZoomOut}
          onFit={onFit}
          onReset={onReset}
        />
      </div>
    </div>
  );
}
