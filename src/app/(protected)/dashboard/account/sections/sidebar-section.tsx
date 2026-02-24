"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";
import { useWorkspace } from "@/contexts/team-context";
import { toast } from "sonner";
import { Loader2, RotateCcw } from "lucide-react";
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
import { SortableNavItem } from "@/components/sidebar/sortable-nav-item";
import { crmGroup, toolsGroup, type NavItem } from "@/components/app-sidebar";
import { useSidebarConfigStore, getEffectiveItems } from "@/stores/sidebar-config-store";
import type { SidebarConfig } from "@/types/sidebar";

interface EditorItem {
  key: string;
  labelKey: string;
  icon: NavItem["icon"];
  visible: boolean;
}

function GroupEditor({
  title,
  groupKey,
  staticItems,
  config,
  onChange,
}: {
  title: string;
  groupKey: string;
  staticItems: NavItem[];
  config: SidebarConfig | null;
  onChange: (groupKey: string, items: EditorItem[]) => void;
}) {
  const effective = getEffectiveItems(groupKey, staticItems, config);
  const [items, setItems] = useState<EditorItem[]>(
    effective.map((item) => ({
      key: item.key,
      labelKey: item.labelKey,
      icon: item.icon,
      visible: item.visible,
    }))
  );

  useEffect(() => {
    const newEffective = getEffectiveItems(groupKey, staticItems, config);
    setItems(
      newEffective.map((item) => ({
        key: item.key,
        labelKey: item.labelKey,
        icon: item.icon,
        visible: item.visible,
      }))
    );
  }, [config, groupKey, staticItems]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      setItems((prev) => {
        const oldIndex = prev.findIndex((item) => item.key === active.id);
        const newIndex = prev.findIndex((item) => item.key === over.id);
        const newItems = arrayMove(prev, oldIndex, newIndex);
        onChange(groupKey, newItems);
        return newItems;
      });
    },
    [groupKey, onChange]
  );

  const toggleVisibility = useCallback(
    (key: string) => {
      setItems((prev) => {
        const newItems = prev.map((item) =>
          item.key === key ? { ...item, visible: !item.visible } : item
        );
        onChange(groupKey, newItems);
        return newItems;
      });
    },
    [groupKey, onChange]
  );

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="border rounded-lg p-2">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((item) => item.key)}
            strategy={verticalListSortingStrategy}
          >
            {items.map((item) => (
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
      </div>
    </div>
  );
}

export function SidebarSection() {
  const { t } = useTranslation();
  const { currentWorkspace, isOwner } = useWorkspace();
  const { config, source, isLoading, fetch: fetchConfig, update, reset } = useSidebarConfigStore();
  const [saving, setSaving] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<Record<string, EditorItem[]>>({});

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const handleGroupChange = useCallback((groupKey: string, items: EditorItem[]) => {
    pendingRef.current[groupKey] = items;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const currentConfig = useSidebarConfigStore.getState().config;
      const crmItems = pendingRef.current["crm"] || getEffectiveItems("crm", crmGroup.items, currentConfig);
      const toolsItems = pendingRef.current["tools"] || getEffectiveItems("tools", toolsGroup.items, currentConfig);

      const newConfig: SidebarConfig = [
        {
          groupKey: "crm",
          items: crmItems.map((i) => ({ key: i.key, visible: i.visible })),
        },
        {
          groupKey: "tools",
          items: toolsItems.map((i) => ({ key: i.key, visible: i.visible })),
        },
      ];

      try {
        await update(newConfig);
        pendingRef.current = {};
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t("common.failedSave"));
      }
    }, 500);
  }, [update, t]);

  const handleReset = useCallback(async () => {
    pendingRef.current = {};
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    await reset();
    toast.success(t("settings.sidebar.resetDone"));
  }, [reset, t]);

  const handleSetTeamDefault = useCallback(async () => {
    if (!currentWorkspace?.id) return;
    setSaving(true);
    try {
      const currentConfig = useSidebarConfigStore.getState().config;
      const crmItems = getEffectiveItems("crm", crmGroup.items, currentConfig);
      const toolsItems = getEffectiveItems("tools", toolsGroup.items, currentConfig);

      const teamConfig: SidebarConfig = [
        {
          groupKey: "crm",
          items: crmItems.map((i) => ({ key: i.key, visible: i.visible })),
        },
        {
          groupKey: "tools",
          items: toolsItems.map((i) => ({ key: i.key, visible: i.visible })),
        },
      ];

      const res = await fetch(`/api/teams/${currentWorkspace.id}/sidebar-defaults`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(teamConfig),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(t("settings.sidebar.teamSaved"));
      } else {
        toast.error(json.error || t("common.failedSave"));
      }
    } catch {
      toast.error(t("common.failedSave"));
    } finally {
      setSaving(false);
    }
  }, [currentWorkspace, t]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t("settings.sidebar.title")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t("settings.sidebar.description")}</p>
        {source !== "default" && (
          <p className="text-xs text-muted-foreground mt-1">
            {source === "user" ? t("settings.sidebar.yourCustomizationDescription") : t("settings.sidebar.teamDefaultsDescription")}
          </p>
        )}
      </div>
      <Separator />

      <GroupEditor
        title={t("settings.sidebarGroups.crm")}
        groupKey="crm"
        staticItems={crmGroup.items}
        config={config}
        onChange={handleGroupChange}
      />

      <GroupEditor
        title={t("settings.sidebarGroups.tools")}
        groupKey="tools"
        staticItems={toolsGroup.items}
        config={config}
        onChange={handleGroupChange}
      />

      <div className="flex items-center gap-2 pt-2">
        <Button onClick={handleReset} variant="outline" size="sm">
          <RotateCcw className="size-3.5 mr-1" />
          {t("settings.sidebar.resetToSystem")}
        </Button>
        {isOwner && (
          <Button onClick={handleSetTeamDefault} variant="outline" size="sm" disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin mr-1" />}
            {t("settings.sidebar.setAsTeamDefault")}
          </Button>
        )}
      </div>
    </div>
  );
}
