"use client";

import { cn } from "@/lib/utils";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";

// ============================================================================
// Types
// ============================================================================

export interface KanbanColumn {
  id: string;
  title: string;
  color?: string;
  count?: number;
  subtitle?: string;
}

export interface KanbanCard {
  id: string;
  columnId: string;
}

interface KanbanBoardProps<T extends KanbanCard> {
  columns: KanbanColumn[];
  cards: T[];
  renderCard: (card: T) => React.ReactNode;
  onCardMove?: (cardId: string, fromColumnId: string, toColumnId: string) => void;
  onAddCard?: (columnId: string) => void;
  className?: string;
}

// ============================================================================
// Droppable Column
// ============================================================================

function DroppableColumn<T extends KanbanCard>({
  column,
  cards,
  renderCard,
  onAddCard,
}: {
  column: KanbanColumn;
  cards: T[];
  renderCard: (card: T) => React.ReactNode;
  onAddCard?: (columnId: string) => void;
}) {
  const { t } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg bg-muted/30" role="list" aria-label={`${column.title}, ${column.count ?? cards.length} items`}>
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        {column.color && (
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={{ backgroundColor: column.color }}
          />
        )}
        <span className="text-sm font-medium truncate">{column.title}</span>
        <span className="rounded-full bg-foreground/10 px-1.5 py-0.5 text-xs text-muted-foreground">
          {column.count ?? cards.length}
        </span>
        {column.subtitle && (
          <span className="ml-auto text-xs text-muted-foreground truncate">
            {column.subtitle}
          </span>
        )}
      </div>

      {/* Cards container */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 space-y-2 px-2 pb-2 min-h-[80px] transition-colors rounded-b-lg",
          isOver && "bg-muted/50"
        )}
      >
        <SortableContext
          items={cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {cards.map((card) => (
            <SortableCard key={card.id} card={card} renderCard={renderCard} />
          ))}
        </SortableContext>

        {cards.length === 0 && (
          <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
            {t("crm.kanban.noItems")}
          </div>
        )}

        {onAddCard && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-8 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onAddCard(column.id)}
            aria-label={`Add card to ${column.title}`}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            {t("crm.kanban.add")}
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Sortable Card
// ============================================================================

function SortableCard<T extends KanbanCard>({
  card,
  renderCard,
}: {
  card: T;
  renderCard: (card: T) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      role="listitem"
      aria-roledescription="draggable card"
      className={cn("transition-shadow", isDragging && "opacity-50")}
    >
      {renderCard(card)}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function KanbanBoard<T extends KanbanCard>({
  columns,
  cards,
  renderCard,
  onCardMove,
  onAddCard,
  className,
}: KanbanBoardProps<T>) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over || !onCardMove) return;

      const cardId = String(active.id);
      const card = cards.find((c) => c.id === cardId);
      if (!card) return;

      // Determine target column
      let targetColumnId = String(over.id);
      const overCard = cards.find((c) => c.id === targetColumnId);
      if (overCard) {
        targetColumnId = overCard.columnId;
      }

      if (card.columnId !== targetColumnId) {
        onCardMove(cardId, card.columnId, targetColumnId);
      }
    },
    [cards, onCardMove]
  );

  const activeCard = activeId ? cards.find((c) => c.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div role="region" aria-label="Kanban board" className={cn("flex gap-4 overflow-x-auto pb-4", className)}>
        {columns.map((column) => {
          const columnCards = cards.filter((c) => c.columnId === column.id);
          return (
            <DroppableColumn
              key={column.id}
              column={column}
              cards={columnCards}
              renderCard={renderCard}
              onAddCard={onAddCard}
            />
          );
        })}
      </div>

      <DragOverlay>
        {activeCard ? (
          <div className="rotate-2 shadow-lg">{renderCard(activeCard)}</div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
