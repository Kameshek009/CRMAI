import { create } from "zustand";
import type { FeatureLimitKey } from "@/types";

interface FeatureUsage {
  current: number;
  limit: number; // 0 = unlimited
}

interface UpgradeModalState {
  isOpen: boolean;
  feature?: FeatureLimitKey;
  current?: number;
  limit?: number;
}

interface FeatureLimitStore {
  usage: Record<FeatureLimitKey, FeatureUsage> | null;
  isLoading: boolean;
  upgradeModal: UpgradeModalState;

  fetch: () => Promise<void>;

  isUnlimited: (feature: FeatureLimitKey) => boolean;
  isNearLimit: (feature: FeatureLimitKey) => boolean;
  isAtLimit: (feature: FeatureLimitKey) => boolean;
  getUsagePercent: (feature: FeatureLimitKey) => number;
  getUsageInfo: (feature: FeatureLimitKey) => FeatureUsage | null;

  incrementUsage: (feature: FeatureLimitKey) => void;

  showUpgradeModal: (feature: FeatureLimitKey, current: number, limit: number) => void;
  closeUpgradeModal: () => void;
}

export const useFeatureLimitStore = create<FeatureLimitStore>((set, get) => ({
  usage: null,
  isLoading: true,
  upgradeModal: { isOpen: false },

  fetch: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch("/api/crm/usage-counts");
      const json = await res.json();
      if (json.success) {
        set({ usage: json.data });
      }
    } catch {
      // silently fail — usage UI just won't show
    } finally {
      set({ isLoading: false });
    }
  },

  isUnlimited: (feature) => {
    const u = get().usage?.[feature];
    return !u || u.limit === 0;
  },

  isNearLimit: (feature) => {
    const u = get().usage?.[feature];
    if (!u || u.limit === 0) return false;
    return u.current >= Math.ceil(u.limit * 0.8) && u.current < u.limit;
  },

  isAtLimit: (feature) => {
    const u = get().usage?.[feature];
    if (!u || u.limit === 0) return false;
    return u.current >= u.limit;
  },

  getUsagePercent: (feature) => {
    const u = get().usage?.[feature];
    if (!u || u.limit === 0) return 0;
    return Math.min(Math.round((u.current / u.limit) * 100), 100);
  },

  getUsageInfo: (feature) => {
    return get().usage?.[feature] ?? null;
  },

  incrementUsage: (feature) => {
    const { usage } = get();
    if (!usage) return;
    const u = usage[feature];
    if (!u) return;
    set({
      usage: {
        ...usage,
        [feature]: { ...u, current: u.current + 1 },
      },
    });
  },

  showUpgradeModal: (feature, current, limit) => {
    set({ upgradeModal: { isOpen: true, feature, current, limit } });
  },

  closeUpgradeModal: () => {
    set({ upgradeModal: { isOpen: false } });
  },
}));
