"use client";

import { useState, useEffect } from "react";
import type { FeatureLimitKey } from "@/types";

interface FeatureUsage {
  current: number;
  limit: number; // 0 = unlimited
}

interface UseFeatureLimitsResult {
  usage: Record<FeatureLimitKey, FeatureUsage> | null;
  isLoading: boolean;
  isAtLimit: (feature: FeatureLimitKey) => boolean;
  refresh: () => void;
}

export function useFeatureLimits(): UseFeatureLimitsResult {
  const [usage, setUsage] = useState<Record<FeatureLimitKey, FeatureUsage> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setIsLoading(true);
    fetch("/api/crm/usage-counts")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setUsage(json.data);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [refreshKey]);

  const isAtLimit = (feature: FeatureLimitKey): boolean => {
    if (!usage) return false;
    const u = usage[feature];
    if (!u || u.limit === 0) return false; // unlimited
    return u.current >= u.limit;
  };

  const refresh = () => setRefreshKey((k) => k + 1);

  return { usage, isLoading, isAtLimit, refresh };
}
