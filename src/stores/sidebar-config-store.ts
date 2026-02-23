import { create } from "zustand";
import type { SidebarConfig } from "@/types/sidebar";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  key: string;
  labelKey: string;
  href: string;
  icon: LucideIcon;
  permission?: string;
}

interface SidebarConfigStore {
  config: SidebarConfig | null;
  source: "user" | "team" | "default";
  isLoading: boolean;

  fetch: () => Promise<void>;
  update: (config: SidebarConfig) => Promise<void>;
  reset: () => Promise<void>;
}

export const useSidebarConfigStore = create<SidebarConfigStore>((set, get) => ({
  config: null,
  source: "default",
  isLoading: true,

  fetch: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch("/api/account/sidebar");
      const json = await res.json();
      if (json.success) {
        set({ config: json.data.config, source: json.data.source });
      }
    } catch {
      // silently fail — use defaults
    } finally {
      set({ isLoading: false });
    }
  },

  update: async (config) => {
    const prev = { config: get().config, source: get().source };
    set({ config, source: "user" });
    try {
      const res = await fetch("/api/account/sidebar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Failed to save sidebar config");
      }
    } catch (e) {
      set({ config: prev.config, source: prev.source });
      throw e;
    }
  },

  reset: async () => {
    try {
      await fetch("/api/account/sidebar", { method: "DELETE" });
      await get().fetch();
    } catch {
      // silently fail
    }
  },
}));

/**
 * Merge static nav items with saved sidebar config.
 * Returns items in the order defined by config, with visibility applied.
 * Items not in config (newly added) are appended at the end as visible.
 */
export function getEffectiveItems(
  groupKey: string,
  staticItems: NavItem[],
  config: SidebarConfig | null
): (NavItem & { visible: boolean })[] {
  if (!config) {
    return staticItems.map((item) => ({ ...item, visible: true }));
  }

  const group = config.find((g) => g.groupKey === groupKey);
  if (!group) {
    return staticItems.map((item) => ({ ...item, visible: true }));
  }

  const staticMap = new Map(staticItems.map((item) => [item.key, item]));
  const result: (NavItem & { visible: boolean })[] = [];
  const seen = new Set<string>();

  // Add items in config order
  for (const cfg of group.items) {
    const item = staticMap.get(cfg.key);
    if (item) {
      result.push({ ...item, visible: cfg.visible });
      seen.add(cfg.key);
    }
  }

  // Append any new items not in config
  for (const item of staticItems) {
    if (!seen.has(item.key)) {
      result.push({ ...item, visible: true });
    }
  }

  return result;
}

/**
 * Get all items (including hidden ones) for editor UI.
 */
export function getAllItemsForEditor(
  groupKey: string,
  staticItems: NavItem[],
  config: SidebarConfig | null
): (NavItem & { visible: boolean })[] {
  return getEffectiveItems(groupKey, staticItems, config);
}
