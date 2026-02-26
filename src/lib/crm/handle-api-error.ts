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
  status?: number;
}

/**
 * Handles API error responses with special treatment for FEATURE_LIMIT_EXCEEDED.
 * Shows upgrade modal for limit errors, context-aware toast for everything else.
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

/**
 * Shows a context-aware toast for HTTP status codes.
 * Use this when you have the Response object (or status code).
 */
export function toastForStatus(status: number, fallback?: string): void {
  switch (status) {
    case 403:
      toast.error("Insufficient permissions");
      break;
    case 429:
      toast.error("Too many requests. Please wait a moment.");
      break;
    default:
      toast.error(fallback || "Something went wrong");
  }
}

/**
 * Shows a network-error toast (for use in catch blocks after fetch failures).
 */
export function toastNetworkError(): void {
  toast.error(
    navigator.onLine
      ? "Connection error. Please try again."
      : "No internet connection",
  );
}
