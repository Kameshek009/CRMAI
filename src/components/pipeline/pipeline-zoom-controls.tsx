"use client";

import { Button } from "@/components/ui/button";
import { Minus, Plus, Maximize, RotateCcw } from "lucide-react";

interface PipelineZoomControlsProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onReset: () => void;
}

export function PipelineZoomControls({
  scale,
  onZoomIn,
  onZoomOut,
  onFit,
  onReset,
}: PipelineZoomControlsProps) {
  return (
    <div className="flex items-center gap-1 bg-background/80 backdrop-blur-sm border rounded-lg p-1 shadow-sm">
      <Button variant="ghost" size="icon" className="size-7" onClick={onFit} title="Fit to screen">
        <Maximize className="size-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="size-7" onClick={onZoomOut} title="Zoom out">
        <Minus className="size-3.5" />
      </Button>
      <span className="text-xs font-mono w-10 text-center tabular-nums">
        {Math.round(scale * 100)}%
      </span>
      <Button variant="ghost" size="icon" className="size-7" onClick={onZoomIn} title="Zoom in">
        <Plus className="size-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="size-7" onClick={onReset} title="Reset to 100%">
        <RotateCcw className="size-3.5" />
      </Button>
    </div>
  );
}
