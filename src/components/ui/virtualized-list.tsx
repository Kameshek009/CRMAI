"use client";

import { useRef, type ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface VirtualizedListProps<T> {
  /** Array of items to render */
  items: T[];
  /** Estimated height (in px) of each item row */
  estimateSize: number;
  /** Render function for each item */
  renderItem: (item: T, index: number) => ReactNode;
  /** Optional CSS class for the scrollable container */
  className?: string;
  /** Number of items to render outside the visible area (default: 5) */
  overscan?: number;
  /** Minimum item count to activate virtualization (default: 50) */
  virtualizationThreshold?: number;
}

// ============================================================================
// Component
// ============================================================================

/**
 * A generic virtualized list component powered by @tanstack/react-virtual.
 *
 * For small lists (fewer than `virtualizationThreshold` items) it renders
 * all items directly without virtualization to avoid unnecessary overhead.
 *
 * Usage:
 * ```tsx
 * <VirtualizedList
 *   items={contacts}
 *   estimateSize={64}
 *   renderItem={(contact, index) => <ContactCard contact={contact} />}
 *   className="h-[600px]"
 * />
 * ```
 */
export function VirtualizedList<T>({
  items,
  estimateSize,
  renderItem,
  className,
  overscan = 5,
  virtualizationThreshold = 50,
}: VirtualizedListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  // For small lists, render everything directly without virtualization
  if (items.length < virtualizationThreshold) {
    return (
      <div className={cn("overflow-auto", className)}>
        {items.map((item, index) => (
          <div key={index}>{renderItem(item, index)}</div>
        ))}
      </div>
    );
  }

  return <VirtualizedListInner
    parentRef={parentRef}
    items={items}
    estimateSize={estimateSize}
    renderItem={renderItem}
    className={className}
    overscan={overscan}
  />;
}

// ============================================================================
// Inner component (uses hooks unconditionally)
// ============================================================================

interface VirtualizedListInnerProps<T> {
  parentRef: React.RefObject<HTMLDivElement | null>;
  items: T[];
  estimateSize: number;
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
  overscan: number;
}

function VirtualizedListInner<T>({
  parentRef,
  items,
  estimateSize,
  renderItem,
  className,
  overscan,
}: VirtualizedListInnerProps<T>) {
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className={cn("overflow-auto", className)}
    >
      <div
        className="relative w-full"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualItems.map((virtualRow) => (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
            className="absolute left-0 w-full"
            style={{ top: `${virtualRow.start}px` }}
          >
            {renderItem(items[virtualRow.index], virtualRow.index)}
          </div>
        ))}
      </div>
    </div>
  );
}
