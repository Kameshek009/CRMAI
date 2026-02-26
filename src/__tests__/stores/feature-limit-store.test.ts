import { describe, it, expect, beforeEach, vi } from "vitest";
import { useFeatureLimitStore } from "@/stores/feature-limit-store";
import type { FeatureLimitKey } from "@/types";

/** Helper type for partial usage records in tests */
type TestUsage = Record<FeatureLimitKey, { current: number; limit: number }>;

describe("useFeatureLimitStore", () => {
  beforeEach(() => {
    useFeatureLimitStore.setState({
      usage: null,
      isLoading: true,
      upgradeModal: { isOpen: false },
    });
    vi.restoreAllMocks();
  });

  // 1. Initial state
  it("should have correct initial state: usage=null, isLoading=true, upgradeModal closed", () => {
    const state = useFeatureLimitStore.getState();

    expect(state.usage).toBeNull();
    expect(state.isLoading).toBe(true);
    expect(state.upgradeModal.isOpen).toBe(false);
  });

  // 2. isUnlimited: usage=null → true
  it("isUnlimited returns true when usage is null (no data)", () => {
    const result = useFeatureLimitStore.getState().isUnlimited("contacts");

    expect(result).toBe(true);
  });

  // 3. isUnlimited: limit=0 → true
  it("isUnlimited returns true when limit=0 (unlimited plan)", () => {
    useFeatureLimitStore.setState({
      usage: { contacts: { current: 50, limit: 0 } } as Partial<TestUsage> as TestUsage,
    });

    const result = useFeatureLimitStore.getState().isUnlimited("contacts");

    expect(result).toBe(true);
  });

  // 4. isUnlimited: limit=100 → false
  it("isUnlimited returns false when limit is a positive number", () => {
    useFeatureLimitStore.setState({
      usage: { contacts: { current: 50, limit: 100 } } as Partial<TestUsage> as TestUsage,
    });

    const result = useFeatureLimitStore.getState().isUnlimited("contacts");

    expect(result).toBe(false);
  });

  // 5. isNearLimit: current=79, limit=100 → false
  it("isNearLimit returns false when current is below 80% threshold (79/100)", () => {
    useFeatureLimitStore.setState({
      usage: { contacts: { current: 79, limit: 100 } } as Partial<TestUsage> as TestUsage,
    });

    const result = useFeatureLimitStore.getState().isNearLimit("contacts");

    expect(result).toBe(false);
  });

  // 6. isNearLimit: current=80, limit=100 → true
  it("isNearLimit returns true when current is at 80% threshold (80/100)", () => {
    useFeatureLimitStore.setState({
      usage: { contacts: { current: 80, limit: 100 } } as Partial<TestUsage> as TestUsage,
    });

    const result = useFeatureLimitStore.getState().isNearLimit("contacts");

    expect(result).toBe(true);
  });

  // 7. isNearLimit: current=100, limit=100 → false (at limit, not near)
  it("isNearLimit returns false when current equals limit (at limit, not near)", () => {
    useFeatureLimitStore.setState({
      usage: { contacts: { current: 100, limit: 100 } } as Partial<TestUsage> as TestUsage,
    });

    const result = useFeatureLimitStore.getState().isNearLimit("contacts");

    expect(result).toBe(false);
  });

  // 8. isNearLimit: limit=0 → false (unlimited)
  it("isNearLimit returns false when limit=0 (unlimited)", () => {
    useFeatureLimitStore.setState({
      usage: { contacts: { current: 50, limit: 0 } } as Partial<TestUsage> as TestUsage,
    });

    const result = useFeatureLimitStore.getState().isNearLimit("contacts");

    expect(result).toBe(false);
  });

  // 9. isAtLimit: current=100, limit=100 → true
  it("isAtLimit returns true when current equals limit", () => {
    useFeatureLimitStore.setState({
      usage: { contacts: { current: 100, limit: 100 } } as Partial<TestUsage> as TestUsage,
    });

    const result = useFeatureLimitStore.getState().isAtLimit("contacts");

    expect(result).toBe(true);
  });

  // 10. isAtLimit: current=50, limit=100 → false
  it("isAtLimit returns false when current is below limit", () => {
    useFeatureLimitStore.setState({
      usage: { contacts: { current: 50, limit: 100 } } as Partial<TestUsage> as TestUsage,
    });

    const result = useFeatureLimitStore.getState().isAtLimit("contacts");

    expect(result).toBe(false);
  });

  // 11. getUsagePercent: various scenarios
  it("getUsagePercent returns correct percentage, caps at 100, and returns 0 for unlimited", () => {
    // 50/100 → 50
    useFeatureLimitStore.setState({
      usage: { contacts: { current: 50, limit: 100 } } as Partial<TestUsage> as TestUsage,
    });
    expect(useFeatureLimitStore.getState().getUsagePercent("contacts")).toBe(50);

    // 150/100 → 100 (capped)
    useFeatureLimitStore.setState({
      usage: { contacts: { current: 150, limit: 100 } } as Partial<TestUsage> as TestUsage,
    });
    expect(useFeatureLimitStore.getState().getUsagePercent("contacts")).toBe(100);

    // unlimited → 0
    useFeatureLimitStore.setState({
      usage: { contacts: { current: 50, limit: 0 } } as Partial<TestUsage> as TestUsage,
    });
    expect(useFeatureLimitStore.getState().getUsagePercent("contacts")).toBe(0);
  });

  // 12. incrementUsage: increases current by 1
  it("incrementUsage increases current by 1", () => {
    useFeatureLimitStore.setState({
      usage: { contacts: { current: 5, limit: 100 } } as Partial<TestUsage> as TestUsage,
    });

    useFeatureLimitStore.getState().incrementUsage("contacts");

    const usage = useFeatureLimitStore.getState().usage!;
    expect(usage.contacts.current).toBe(6);
  });

  // 13. incrementUsage: does nothing if usage=null
  it("incrementUsage does nothing when usage is null", () => {
    useFeatureLimitStore.setState({ usage: null });

    useFeatureLimitStore.getState().incrementUsage("contacts");

    expect(useFeatureLimitStore.getState().usage).toBeNull();
  });

  // 14. showUpgradeModal / closeUpgradeModal
  it("showUpgradeModal opens modal with params, closeUpgradeModal closes it", () => {
    useFeatureLimitStore.getState().showUpgradeModal("contacts", 100, 100);

    const modal = useFeatureLimitStore.getState().upgradeModal;
    expect(modal.isOpen).toBe(true);
    expect(modal.feature).toBe("contacts");
    expect(modal.current).toBe(100);
    expect(modal.limit).toBe(100);

    useFeatureLimitStore.getState().closeUpgradeModal();

    const closed = useFeatureLimitStore.getState().upgradeModal;
    expect(closed.isOpen).toBe(false);
  });

  // 15. fetch: mock global fetch, verify usage is set
  it("fetch sets usage from API response and sets isLoading=false", async () => {
    const mockData = {
      contacts: { current: 10, limit: 100 },
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: () => Promise.resolve({ success: true, data: mockData }),
      })
    );

    await useFeatureLimitStore.getState().fetch();

    const state = useFeatureLimitStore.getState();
    expect(state.usage).toEqual(mockData);
    expect(state.isLoading).toBe(false);
    expect(fetch).toHaveBeenCalledWith("/api/crm/usage-counts");
  });
});
