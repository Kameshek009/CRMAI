import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase } from "@/__tests__/helpers/mock-supabase";
import { createTestRequest } from "@/__tests__/helpers/mock-context";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/usage/check", () => ({ calculateTeamUsageStats: vi.fn() }));
vi.mock("@/lib/stripe/customer", () => ({ getCustomerBillingInfo: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { GET } from "@/app/api/billing/account/route";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { calculateTeamUsageStats } from "@/lib/usage/check";
import { getCustomerBillingInfo } from "@/lib/stripe/customer";

type AuthReturn = Awaited<ReturnType<typeof auth>>;

describe("GET /api/billing/account", () => {
  let supabase: ReturnType<typeof createMockSupabase>["supabase"];
  let setResult: ReturnType<typeof createMockSupabase>["setResult"];

  beforeEach(() => {
    vi.clearAllMocks();
    const mock = createMockSupabase();
    supabase = mock.supabase;
    setResult = mock.setResult;
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as unknown as AuthReturn);

    const req = createTestRequest("GET", "/api/billing/account");
    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 404 when account not found", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk-user-123" } as unknown as AuthReturn);

    setResult("accounts", { data: null, error: { code: "PGRST116" } });

    const req = createTestRequest("GET", "/api/billing/account");
    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Account not found");
  });

  it("returns 404 when no team found", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk-user-123" } as unknown as AuthReturn);

    // Account found
    setResult("accounts", {
      data: { id: "acc-123", current_team_id: null, clerk_user_id: "clerk-user-123" },
      error: null,
    });

    // No owned team
    setResult("teams", { data: null, error: { code: "PGRST116" } });

    const req = createTestRequest("GET", "/api/billing/account");
    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
    expect(json.error).toBe("No team found");
  });

  it("returns billing data successfully", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk-user-123" } as unknown as AuthReturn);

    const mockAccount = {
      id: "acc-123",
      current_team_id: "team-456",
      clerk_user_id: "clerk-user-123",
    };

    const mockTeam = {
      id: "team-456",
      name: "Test Team",
      tier: "pro",
      seat_count: 3,
      owner_account_id: "acc-123",
      token_limit: 500000,
      tokens_used: 10000,
      weekly_tokens_used: 2000,
      week_start_date: "2026-02-20T00:00:00Z",
      billing_cycle_start: "2026-02-01T00:00:00Z",
      stripe_customer_id: "cus_test_123",
    };

    const mockUsageStats = {
      tokensUsed: 10000,
      tokenLimit: 500000,
      usagePercent: 2,
      isOverLimit: false,
    };

    const mockStripeBilling = {
      subscription: { id: "sub_123", status: "active" },
      defaultPaymentMethod: null,
    };

    // Account query
    setResult("accounts", { data: mockAccount, error: null });

    // Owned team query
    setResult("teams", { data: mockTeam, error: null });

    // Payment history query
    setResult("payment_history", {
      data: [
        {
          id: "pay-1",
          account_id: "acc-123",
          team_id: "team-456",
          stripe_invoice_id: "inv_123",
          stripe_checkout_session_id: null,
          payment_type: "subscription",
          tier_or_package: "pro",
          amount_cents: 2900,
          currency: "usd",
          status: "succeeded",
          created_at: "2026-02-01T00:00:00Z",
          completed_at: "2026-02-01T00:01:00Z",
        },
      ],
      error: null,
    });

    vi.mocked(calculateTeamUsageStats).mockReturnValue(mockUsageStats as unknown as ReturnType<typeof calculateTeamUsageStats>);
    vi.mocked(getCustomerBillingInfo).mockResolvedValue(mockStripeBilling as unknown as Awaited<ReturnType<typeof getCustomerBillingInfo>>);

    const req = createTestRequest("GET", "/api/billing/account");
    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.team.id).toBe("team-456");
    expect(json.data.team.name).toBe("Test Team");
    expect(json.data.team.tier).toBe("pro");
    expect(json.data.team.seatCount).toBe(3);
    expect(json.data.team.isDirector).toBe(true);
    expect(json.data.usageStats).toEqual(mockUsageStats);
    expect(json.data.paymentHistory).toHaveLength(1);
    expect(json.data.paymentHistory[0].amountCents).toBe(2900);
    expect(json.data.stripeBilling).toEqual(mockStripeBilling);

    expect(calculateTeamUsageStats).toHaveBeenCalledWith({
      tier: "pro",
      token_limit: 500000,
      tokens_used: 10000,
      weekly_tokens_used: 2000,
      week_start_date: "2026-02-20T00:00:00Z",
      billing_cycle_start: "2026-02-01T00:00:00Z",
      seat_count: 3,
    });
    expect(getCustomerBillingInfo).toHaveBeenCalledWith("cus_test_123");
  });
});
