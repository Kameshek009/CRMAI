"use client";

import { Input } from "@/components/ui/input";
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
    <div className="flex items-center justify-between gap-4 px-4 py-2 border-b bg-background/95 backdrop-blur-sm shrink-0">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold">Pipeline</h1>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1 font-medium">
            <DollarSign className="size-4" />
            {totalValue.toLocaleString()}
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <TrendingUp className="size-4" />
            ${weightedForecast.toLocaleString()} weighted
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search deals..."
            className="h-8 w-48 pl-8 text-sm"
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
