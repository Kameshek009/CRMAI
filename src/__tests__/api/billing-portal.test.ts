import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase } from "@/__tests__/helpers/mock-supabase";
import { createTestRequest } from "@/__tests__/helpers/mock-context";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/stripe/server", () => ({ createPortalSession: vi.fn() }));
vi.mock("@/lib/stripe/customer", () => ({
  getOrCreateStripeCustomer: vi.fn(),
}));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { POST } from "@/app/api/billing/portal/route";
import { auth, currentUser } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { createPortalSession } from "@/lib/stripe/server";
import { getOrCreateStripeCustomer } from "@/lib/stripe/customer";

describe("POST /api/billing/portal", () => {
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

    const req = createTestRequest("POST", "/api/billing/portal");
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 404 when user not found (currentUser returns null)", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk-user-123" } as any);
    vi.mocked(currentUser).mockResolvedValue(null);

    const req = createTestRequest("POST", "/api/billing/portal");
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
    expect(json.error).toBe("User not found");
  });

  it("returns 404 when account not found", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk-user-123" } as any);
    vi.mocked(currentUser).mockResolvedValue({
      id: "clerk-user-123",
      emailAddresses: [{ id: "email-1", emailAddress: "test@example.com" }],
      primaryEmailAddressId: "email-1",
      fullName: "Test User",
    } as any);

    // No account
    setResult("accounts", { data: null, error: { code: "PGRST116" } });

    const req = createTestRequest("POST", "/api/billing/portal");
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Account not found");
  });

  it("returns 403 when user does not own a team", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk-user-123" } as any);
    vi.mocked(currentUser).mockResolvedValue({
      id: "clerk-user-123",
      emailAddresses: [{ id: "email-1", emailAddress: "test@example.com" }],
      primaryEmailAddressId: "email-1",
      fullName: "Test User",
    } as any);

    // Account found
    setResult("accounts", {
      data: { id: "acc-123", stripe_customer_id: null },
      error: null,
    });

    // No owned team
    setResult("teams", { data: null, error: { code: "PGRST116" } });

    const req = createTestRequest("POST", "/api/billing/portal");
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.success).toBe(false);
    expect(json.error).toContain("Only the team director");
  });

  it("creates portal session successfully", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk-user-123" } as any);
    vi.mocked(currentUser).mockResolvedValue({
      id: "clerk-user-123",
      emailAddresses: [{ id: "email-1", emailAddress: "test@example.com" }],
      primaryEmailAddressId: "email-1",
      fullName: "Test User",
    } as any);
    vi.mocked(getOrCreateStripeCustomer).mockResolvedValue("cus_test_123");
    vi.mocked(createPortalSession).mockResolvedValue({
      url: "https://billing.stripe.com/session/test_portal",
    } as any);

    // Account found
    setResult("accounts", {
      data: { id: "acc-123", stripe_customer_id: "cus_old_123" },
      error: null,
    });

    // Owned team found
    setResult("teams", {
      data: {
        id: "team-456",
        stripe_customer_id: "cus_team_123",
        owner_account_id: "acc-123",
      },
      error: null,
    });

    const req = createTestRequest("POST", "/api/billing/portal");
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.url).toBe("https://billing.stripe.com/session/test_portal");

    expect(getOrCreateStripeCustomer).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: "acc-123",
        clerkUserId: "clerk-user-123",
        email: "test@example.com",
        name: "Test User",
        teamId: "team-456",
        existingStripeCustomerId: "cus_team_123",
      })
    );
    expect(createPortalSession).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: "cus_test_123",
      })
    );
  });
});
