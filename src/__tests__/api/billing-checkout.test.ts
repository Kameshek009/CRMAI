import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase } from "@/__tests__/helpers/mock-supabase";
import { createTestRequest } from "@/__tests__/helpers/mock-context";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/stripe/server", () => ({
  createPerSeatCheckout: vi.fn(),
  getSeatPrices: vi.fn(),
  getCheckoutSession: vi.fn(),
  stripe: { subscriptions: { retrieve: vi.fn(), cancel: vi.fn() } },
}));
vi.mock("@/lib/stripe/customer", () => ({
  getOrCreateStripeCustomer: vi.fn(),
}));
vi.mock("@/lib/constants/tiers", () => ({
  TIER_TOKEN_LIMITS: { free: 50000, pro: 500000, max: 2000000 },
  TIER_MAX_MEMBERS: { free: 3, pro: 10, max: 50 },
}));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { POST } from "@/app/api/billing/checkout/subscription/route";
import { GET } from "@/app/api/billing/checkout/verify/route";
import { auth, currentUser } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import {
  createPerSeatCheckout,
  getSeatPrices,
  getCheckoutSession,
} from "@/lib/stripe/server";
import { getOrCreateStripeCustomer } from "@/lib/stripe/customer";

describe("POST /api/billing/checkout/subscription", () => {
  let supabase: ReturnType<typeof createMockSupabase>["supabase"];
  let setResult: ReturnType<typeof createMockSupabase>["setResult"];

  beforeEach(() => {
    vi.clearAllMocks();
    const mock = createMockSupabase();
    supabase = mock.supabase;
    setResult = mock.setResult;
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);

    const req = createTestRequest("POST", "/api/billing/checkout/subscription", {
      tier: "pro",
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 400 for invalid tier", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk-user-123" } as any);
    vi.mocked(currentUser).mockResolvedValue({
      id: "clerk-user-123",
      emailAddresses: [{ id: "email-1", emailAddress: "test@example.com" }],
      primaryEmailAddressId: "email-1",
      fullName: "Test User",
    } as any);

    const req = createTestRequest("POST", "/api/billing/checkout/subscription", {
      tier: "enterprise",
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toContain("Invalid tier");
  });

  it("returns 403 when user does not own a team", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk-user-123" } as any);
    vi.mocked(currentUser).mockResolvedValue({
      id: "clerk-user-123",
      emailAddresses: [{ id: "email-1", emailAddress: "test@example.com" }],
      primaryEmailAddressId: "email-1",
      fullName: "Test User",
    } as any);
    vi.mocked(getSeatPrices).mockReturnValue({
      pro: "price_pro_123",
      max: "price_max_123",
    } as any);

    // Account found
    setResult("accounts", {
      data: { id: "acc-123", current_team_id: "team-456", stripe_customer_id: null },
      error: null,
    });

    // No owned team
    setResult("teams", { data: null, error: { code: "PGRST116" } });

    const req = createTestRequest("POST", "/api/billing/checkout/subscription", {
      tier: "pro",
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.success).toBe(false);
    expect(json.error).toContain("You must own a team");
  });

  it("returns 400 when team is already on requested tier", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk-user-123" } as any);
    vi.mocked(currentUser).mockResolvedValue({
      id: "clerk-user-123",
      emailAddresses: [{ id: "email-1", emailAddress: "test@example.com" }],
      primaryEmailAddressId: "email-1",
      fullName: "Test User",
    } as any);
    vi.mocked(getSeatPrices).mockReturnValue({
      pro: "price_pro_123",
      max: "price_max_123",
    } as any);

    // Account found
    setResult("accounts", {
      data: { id: "acc-123", current_team_id: "team-456", stripe_customer_id: null },
      error: null,
    });

    // Team already on "pro"
    setResult("teams", {
      data: {
        id: "team-456",
        owner_account_id: "acc-123",
        tier: "pro",
        stripe_subscription_id: null,
        stripe_customer_id: null,
      },
      error: null,
    });

    const req = createTestRequest("POST", "/api/billing/checkout/subscription", {
      tier: "pro",
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toContain("already on the pro plan");
  });

  it("creates checkout session successfully", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk-user-123" } as any);
    vi.mocked(currentUser).mockResolvedValue({
      id: "clerk-user-123",
      emailAddresses: [{ id: "email-1", emailAddress: "test@example.com" }],
      primaryEmailAddressId: "email-1",
      fullName: "Test User",
    } as any);
    vi.mocked(getSeatPrices).mockReturnValue({
      pro: "price_pro_123",
      max: "price_max_123",
    } as any);
    vi.mocked(getOrCreateStripeCustomer).mockResolvedValue("cus_test_123");
    vi.mocked(createPerSeatCheckout).mockResolvedValue({
      id: "cs_test_session",
      client_secret: "cs_secret_123",
      url: null,
    } as any);

    // Account found
    setResult("accounts", {
      data: { id: "acc-123", current_team_id: "team-456", stripe_customer_id: null },
      error: null,
    });

    // Owned team on free tier
    setResult("teams", {
      data: {
        id: "team-456",
        owner_account_id: "acc-123",
        tier: "free",
        stripe_subscription_id: null,
        stripe_customer_id: null,
      },
      error: null,
    });

    // Active members count
    setResult("team_members", { data: null, error: null, count: 2 });

    const req = createTestRequest("POST", "/api/billing/checkout/subscription", {
      tier: "pro",
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.sessionId).toBe("cs_test_session");
    expect(json.data.clientSecret).toBe("cs_secret_123");

    expect(createPerSeatCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: "cus_test_123",
        priceId: "price_pro_123",
        seatCount: 2,
        accountId: "acc-123",
        teamId: "team-456",
        tier: "pro",
      })
    );
  });
});

describe("GET /api/billing/checkout/verify", () => {
  let supabase: ReturnType<typeof createMockSupabase>["supabase"];
  let setResult: ReturnType<typeof createMockSupabase>["setResult"];

  beforeEach(() => {
    vi.clearAllMocks();
    const mock = createMockSupabase();
    supabase = mock.supabase;
    setResult = mock.setResult;
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);

    const req = createTestRequest(
      "GET",
      "/api/billing/checkout/verify?session_id=cs_123"
    );
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 400 when missing session_id", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk-user-123" } as any);

    const req = createTestRequest("GET", "/api/billing/checkout/verify");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Missing session_id");
  });

  it("returns session status successfully", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk-user-123" } as any);
    vi.mocked(getCheckoutSession).mockResolvedValue({
      id: "cs_test_123",
      status: "complete",
      metadata: {
        clerk_user_id: "clerk-user-123",
        team_id: "team-456",
        tier: "pro",
      },
      customer: "cus_123",
      subscription: "sub_123",
    } as any);

    // Team query for fallback update
    setResult("teams", { data: { tier: "pro" }, error: null });

    const req = createTestRequest(
      "GET",
      "/api/billing/checkout/verify?session_id=cs_test_123"
    );
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.status).toBe("complete");
    expect(json.data.type).toBe("subscription");
    expect(json.data.tier).toBe("pro");

    expect(getCheckoutSession).toHaveBeenCalledWith("cs_test_123");
  });
});
