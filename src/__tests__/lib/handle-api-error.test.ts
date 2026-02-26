import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/stores/feature-limit-store", () => ({
  useFeatureLimitStore: {
    getState: vi.fn(() => ({
      showUpgradeModal: vi.fn(),
    })),
  },
}));

import { handleApiError } from "@/lib/crm/handle-api-error";
import { toast } from "sonner";
import { useFeatureLimitStore } from "@/stores/feature-limit-store";

describe("handleApiError", () => {
  let mockShowUpgradeModal: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockShowUpgradeModal = vi.fn();
    (useFeatureLimitStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({
      showUpgradeModal: mockShowUpgradeModal,
    });
  });

  it("returns true and calls showUpgradeModal for FEATURE_LIMIT_EXCEEDED", () => {
    const result = handleApiError({
      success: false,
      code: "FEATURE_LIMIT_EXCEEDED",
      feature: "contacts",
      current: 100,
      limit: 100,
    });

    expect(result).toBe(true);
    expect(mockShowUpgradeModal).toHaveBeenCalledWith("contacts", 100, 100);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("returns false and shows toast.error for regular errors", () => {
    const result = handleApiError({
      success: false,
      error: "Not found",
    });

    expect(result).toBe(false);
    expect(toast.error).toHaveBeenCalledWith("Not found");
    expect(mockShowUpgradeModal).not.toHaveBeenCalled();
  });

  it("shows 'Something went wrong' when no error message is provided", () => {
    const result = handleApiError({
      success: false,
    });

    expect(result).toBe(false);
    expect(toast.error).toHaveBeenCalledWith("Something went wrong");
  });

  it("does NOT call showUpgradeModal when code is not FEATURE_LIMIT_EXCEEDED", () => {
    const result = handleApiError({
      success: false,
      code: "SOME_OTHER_CODE",
      feature: "contacts",
      current: 100,
      limit: 100,
      error: "Some error",
    });

    expect(result).toBe(false);
    expect(mockShowUpgradeModal).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Some error");
  });

  it("does NOT call showUpgradeModal when feature is missing", () => {
    const result = handleApiError({
      success: false,
      code: "FEATURE_LIMIT_EXCEEDED",
      current: 100,
      limit: 100,
    });

    expect(result).toBe(false);
    expect(mockShowUpgradeModal).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });

  it("does NOT call showUpgradeModal when current is missing", () => {
    const result = handleApiError({
      success: false,
      code: "FEATURE_LIMIT_EXCEEDED",
      feature: "contacts",
      limit: 100,
    });

    expect(result).toBe(false);
    expect(mockShowUpgradeModal).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });

  it("does NOT call showUpgradeModal when limit is missing", () => {
    const result = handleApiError({
      success: false,
      code: "FEATURE_LIMIT_EXCEEDED",
      feature: "contacts",
      current: 100,
    });

    expect(result).toBe(false);
    expect(mockShowUpgradeModal).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });

  it("handles current=0 correctly (0 is a valid value)", () => {
    const result = handleApiError({
      success: false,
      code: "FEATURE_LIMIT_EXCEEDED",
      feature: "deals",
      current: 0,
      limit: 10,
    });

    expect(result).toBe(true);
    expect(mockShowUpgradeModal).toHaveBeenCalledWith("deals", 0, 10);
  });

  it("handles limit=0 correctly (0 is a valid value)", () => {
    const result = handleApiError({
      success: false,
      code: "FEATURE_LIMIT_EXCEEDED",
      feature: "deals",
      current: 5,
      limit: 0,
    });

    expect(result).toBe(true);
    expect(mockShowUpgradeModal).toHaveBeenCalledWith("deals", 5, 0);
  });
});
