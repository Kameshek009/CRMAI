"use client";

import { ReactNode, forwardRef } from "react";
import type { CanvasTransform } from "@/hooks/use-canvas-transform";

interface PipelineCanvasProps {
  transform: CanvasTransform;
  handlers: Record<string, (e: never) => void>;
  children: ReactNode;
}

export const PipelineCanvas = forwardRef<HTMLDivElement, PipelineCanvasProps>(
  function PipelineCanvas({ transform, handlers, children }, ref) {
    return (
      <div
        ref={ref}
        className="flex-1 overflow-hidden relative"
        data-canvas="true"
        {...handlers}
      >
        <div
          className="absolute origin-top-left will-change-transform"
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          }}
          data-canvas="true"
        >
          {children}
        </div>
      </div>
    );
  }
);
