"use client";

import type { ReactNode } from "react";
import RGL, { WidthProvider, type Layout } from "react-grid-layout";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

// WidthProvider measures the parent and hands width down to GridLayout —
// without it, the grid renders at width=0 and every widget collapses to a
// single column. Module-level so we only wrap once per import.
const ResponsiveGrid = WidthProvider(RGL);

export type DashboardWidgetLayout = {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  type: string;
};

type Props = {
  widgets: DashboardWidgetLayout[];
  isEditMode: boolean;
  onLayoutChange: (next: Layout[]) => void;
  children: ReactNode;
  cols?: number;
  rowHeight?: number;
};

// Thin wrapper around react-grid-layout. The parent owns widget state and
// renders each child as a div keyed by widget id; this component only
// arranges the children and reports new coordinates after drag/resize.
export function DashboardGrid({
  widgets,
  isEditMode,
  onLayoutChange,
  children,
  cols = 12,
  rowHeight = 60,
}: Props) {
  return (
    <ResponsiveGrid
      className="layout"
      layout={widgets}
      cols={cols}
      rowHeight={rowHeight}
      isDraggable={isEditMode}
      isResizable={isEditMode}
      onLayoutChange={onLayoutChange}
      draggableCancel=".no-drag, button, input, textarea, select, a"
      margin={[12, 12]}
      compactType="vertical"
    >
      {children}
    </ResponsiveGrid>
  );
}
