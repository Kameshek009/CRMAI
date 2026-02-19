import { toast } from "sonner";
import { useFeatureLimitStore } from "@/stores/feature-limit-store";
import type { FeatureLimitKey } from "@/types";

interface ApiErrorResponse {
  success: boolean;
  error?: string;
  code?: string;
  feature?: string;
  current?: number;
  limit?: number;
}

/**
 * Handles API error responses with special treatment for FEATURE_LIMIT_EXCEEDED.
 * Shows upgrade modal for limit errors, toast for everything else.
 * Returns true if error was handled as a feature limit (caller should NOT show own toast).
 */
export function handleApiError(json: ApiErrorResponse): boolean {
  if (
    json.code === "FEATURE_LIMIT_EXCEEDED" &&
    json.feature &&
    json.current !== undefined &&
    json.limit !== undefined
  ) {
    useFeatureLimitStore
      .getState()
      .showUpgradeModal(
        json.feature as FeatureLimitKey,
        json.current,
        json.limit
      );
    return true;
  }

  toast.error(json.error || "Something went wrong");
  return false;
}
