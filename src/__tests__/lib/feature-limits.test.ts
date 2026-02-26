import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock createSupabaseAdmin before importing
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: vi.fn(),
}));

import { checkFeatureLimit, requireFeatureLimit } from "@/lib/usage/feature-limits";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import type { SubscriptionTier, FeatureLimitKey } from "@/types";

/**
 * Creates a mock Supabase instance that returns the specified count.
 * The chain is: supabase.from().select().eq().eq()... → { count }
 */
function mockSupabaseCount(count: number) {
  const result = Promise.resolve({ count });
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnValue(undefined),
    eq: vi.fn().mockReturnValue(undefined),
  };
  // Each method returns the chain itself, but 'then' resolves to { count }
  (chain.select as ReturnType<typeof vi.fn>).mockImplementation(() => chain);
  (chain.eq as ReturnType<typeof vi.fn>).mockImplementation(() => chain);
  chain.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => result.then(resolve, reject);
  chain.catch = (reject: (reason: unknown) => unknown) => result.catch(reject);

  const mockSupabase = { from: vi.fn(() => chain) };
  (createSupabaseAdmin as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

  return { mockSupabase, chain };
}

describe("checkFeatureLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns allowed without DB query when limit is 0 (unlimited)", async () => {
    const result = await checkFeatureLimit("team-1", "pro", "tasks");

    expect(result).toEqual({
      allowed: true,
      current: 0,
      limit: 0,
    });
    // Should not call Supabase at all
    expect(createSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("returns allowed when under limit", async () => {
    // free tier: contacts limit = 100
    const { mockSupabase } = mockSupabaseCount(50);

    const result = await checkFeatureLimit("team-1", "free", "contacts");

    expect(result).toEqual({
      allowed: true,
      current: 50,
      limit: 100,
    });
    expect(mockSupabase.from).toHaveBeenCalledWith("contacts");
  });

  it("returns allowed when at limit within grace period", async () => {
    // free tier: contacts limit = 100, grace = ceil(100 * 1.1) = 110
    // current = 105 → should be allowed
    mockSupabaseCount(105);

    const result = await checkFeatureLimit("team-1", "free", "contacts");

    expect(result).toEqual({
      allowed: true,
      current: 105,
      limit: 100,
    });
  });

  it("returns allowed when at computed grace limit due to float ceiling", async () => {
    // free tier: contacts limit = 100
    // JS: Math.ceil(100 * 1.1) = Math.ceil(110.00000000000001) = 111
    // So grace limit is actually 111, and 110 < 111 = true
    mockSupabaseCount(110);

    const result = await checkFeatureLimit("team-1", "free", "contacts");

    expect(result).toEqual({
      allowed: true,
      current: 110,
      limit: 100,
    });
  });

  it("returns not allowed when over grace period", async () => {
    // free tier: contacts limit = 100, grace = 110
    // current = 111 → not allowed
    mockSupabaseCount(111);

    const result = await checkFeatureLimit("team-1", "free", "contacts");

    expect(result).toEqual({
      allowed: false,
      current: 111,
      limit: 100,
    });
  });

  it("handles limit=5 with grace correctly", async () => {
    // free tier: companies limit = 5, grace = ceil(5 * 1.1) = 6
    // current = 5 → allowed
    mockSupabaseCount(5);

    const result = await checkFeatureLimit("team-1", "free", "companies");

    expect(result).toEqual({
      allowed: true,
      current: 5,
      limit: 5,
    });
  });

  it("queries correct table with filters for contacts", async () => {
    const { mockSupabase, chain } = mockSupabaseCount(10);

    await checkFeatureLimit("team-1", "free", "contacts");

    expect(mockSupabase.from).toHaveBeenCalledWith("contacts");
    expect(chain.select).toHaveBeenCalledWith("id", { count: "exact", head: true });
    expect(chain.eq).toHaveBeenCalledWith("team_id", "team-1");
    expect(chain.eq).toHaveBeenCalledWith("is_deleted", false);
  });

  it("queries correct table with filters for activeAutomations", async () => {
    const { mockSupabase, chain } = mockSupabaseCount(3);

    await checkFeatureLimit("team-1", "pro", "activeAutomations");

    expect(mockSupabase.from).toHaveBeenCalledWith("automations");
    expect(chain.eq).toHaveBeenCalledWith("team_id", "team-1");
    expect(chain.eq).toHaveBeenCalledWith("is_active", true);
  });

  it("handles null count as 0", async () => {
    // Simulate Supabase returning null count
    const chain: Record<string, unknown> = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };
    chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve({ count: null }).then(resolve);
    chain.catch = vi.fn().mockReturnThis();

    const mockSupabase = { from: vi.fn(() => chain) };
    (createSupabaseAdmin as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase);

    const result = await checkFeatureLimit("team-1", "free", "contacts");

    expect(result.current).toBe(0);
  });

  it("works with pro tier contacts limit", async () => {
    // pro tier: contacts = 5000, grace = ceil(5000 * 1.1) = 5500
    mockSupabaseCount(5200);

    const result = await checkFeatureLimit("team-1", "pro", "contacts");

    expect(result).toEqual({
      allowed: true,
      current: 5200,
      limit: 5000,
    });
  });

  it("works with enterprise unlimited tier", async () => {
    // enterprise tier: contacts = 0 (unlimited)
    const result = await checkFeatureLimit("team-1", "enterprise", "contacts");

    expect(result).toEqual({
      allowed: true,
      current: 0,
      limit: 0,
    });
    expect(createSupabaseAdmin).not.toHaveBeenCalled();
  });
});

describe("requireFeatureLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when allowed", async () => {
    mockSupabaseCount(50);

    const result = await requireFeatureLimit("team-1", "free", "contacts");

    expect(result).toBeNull();
  });

  it("returns 403 NextResponse when exceeded", async () => {
    // free tier: contacts = 100, grace = 110
    mockSupabaseCount(111);

    const result = await requireFeatureLimit("team-1", "free", "contacts");

    expect(result).not.toBeNull();
    expect(result?.status).toBe(403);

    const json = await result?.json();
    expect(json).toMatchObject({
      success: false,
      code: "FEATURE_LIMIT_EXCEEDED",
      feature: "contacts",
      current: 111,
      limit: 100,
    });
    expect(json.error).toContain("Contacts");
    expect(json.error).toContain("111/100");
  });

  it("includes proper error message with feature label", async () => {
    mockSupabaseCount(11);

    const result = await requireFeatureLimit("team-1", "free", "companies");

    const json = await result?.json();
    expect(json.error).toContain("Companies");
  });

  it("returns null for unlimited features", async () => {
    const result = await requireFeatureLimit("team-1", "enterprise", "contacts");

    expect(result).toBeNull();
  });

  it("returns 403 when exactly at grace limit", async () => {
    // free tier: pipelineStages = 3, grace = ceil(3 * 1.1) = 4
    mockSupabaseCount(4);

    const result = await requireFeatureLimit("team-1", "free", "pipelineStages");

    expect(result).not.toBeNull();
    expect(result?.status).toBe(403);
  });
});
