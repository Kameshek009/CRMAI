"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";

import { Check, X } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { SortableNavItem } from "@/components/sidebar/sortable-nav-item";
import type { NavItem } from "@/components/app-sidebar";

interface EditorItem {
  key: string;
  labelKey: string;
  icon: NavItem["icon"];
  visible: boolean;
}

interface SidebarGroupEditorProps {
  groupKey: string;
  items: (NavItem & { visible: boolean })[];
  staticItems: NavItem[];
  onSave: (items: { key: string; visible: boolean }[]) => void;
  onCancel: () => void;
}

export function SidebarGroupEditor({ items, onSave, onCancel }: SidebarGroupEditorProps) {
  const { t } = useTranslation();
  const [editorItems, setEditorItems] = useState<EditorItem[]>(
    items.map((item) => ({
      key: item.key,
      labelKey: item.labelKey,
      icon: item.icon,
      visible: item.visible,
    }))
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setEditorItems((prev) => {
      const oldIndex = prev.findIndex((item) => item.key === active.id);
      const newIndex = prev.findIndex((item) => item.key === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
  }, []);

  const toggleVisibility = useCallback((key: string) => {
    setEditorItems((prev) =>
      prev.map((item) =>
        item.key === key ? { ...item, visible: !item.visible } : item
      )
    );
  }, []);

  const handleSave = () => {
    onSave(editorItems.map((item) => ({ key: item.key, visible: item.visible })));
  };

  return (
    <div className="space-y-1">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}

        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={editorItems.map((item) => item.key)}
          strategy={verticalListSortingStrategy}
        >
          {editorItems.map((item) => (
            <SortableNavItem
              key={item.key}
              id={item.key}
              labelKey={item.labelKey}
              icon={item.icon}
              visible={item.visible}
              onToggleVisibility={() => toggleVisibility(item.key)}
            />
          ))}
        </SortableContext>
      </DndContext>

      <div className="flex items-center gap-1 pt-1 px-2">
        <button
          onClick={handleSave}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
        >
          <Check className="size-3" />
          {t("nav.sidebar.done")}
        </button>
        <span className="text-muted-foreground/30">|</span>
        <button
          onClick={onCancel}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="size-3" />
        </button>
      </div>
    </div>
  );
}
