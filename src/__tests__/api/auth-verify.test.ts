import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/auth/verify/route";
import { createMockSupabase } from "@/__tests__/helpers/mock-supabase";
import { createTestRequest } from "@/__tests__/helpers/mock-context";

// Mock Clerk
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
  clerkClient: vi.fn(),
}));

// Mock Supabase
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: vi.fn(),
}));

import { auth, clerkClient } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";

describe("POST /api/auth/verify", () => {
  let supabase: ReturnType<typeof createMockSupabase>["supabase"];
  let setResult: ReturnType<typeof createMockSupabase>["setResult"];

  beforeEach(() => {
    vi.clearAllMocks();
    const mock = createMockSupabase();
    supabase = mock.supabase;
    setResult = mock.setResult;
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);
  });

  it("returns existing account data when found", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk-user-123" } as any);

    setResult("accounts", {
      data: {
        id: "acc-123",
        clerk_user_id: "clerk-user-123",
        tier: "pro",
        token_limit: 500000,
        tokens_used: 1000,
        is_active: true,
        name: "Test User",
        email: "test@example.com",
      },
      error: null,
    });

    const req = createTestRequest("POST", "/api/auth/verify");
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.userId).toBe("clerk-user-123");
    expect(json.data.account.id).toBe("acc-123");
    expect(json.data.account.tier).toBe("pro");
  });

  it("creates new account when not found", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk-user-new" } as any);

    // Mock Clerk user lookup
    const mockClerkClient = {
      users: {
        getUser: vi.fn().mockResolvedValue({
          firstName: "New",
          lastName: "User",
          emailAddresses: [{ emailAddress: "new@example.com" }],
        }),
      },
    };
    vi.mocked(clerkClient).mockResolvedValue(mockClerkClient as any);

    // First call: no account found
    setResult("accounts", { data: null, error: { code: "PGRST116" } });

    // Second call: insert new account
    const newAccount = {
      id: "acc-new-123",
      clerk_user_id: "clerk-user-new",
      tier: "free",
      token_limit: 50000,
      tokens_used: 0,
      is_active: true,
      name: "New User",
      email: "new@example.com",
    };
    setResult("accounts", { data: newAccount, error: null });

    const req = createTestRequest("POST", "/api/auth/verify");
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.userId).toBe("clerk-user-new");
    expect(json.data.account.name).toBe("New User");
    expect(json.data.account.email).toBe("new@example.com");
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);

    const req = createTestRequest("POST", "/api/auth/verify");
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 403 for deactivated account", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk-user-inactive" } as any);

    setResult("accounts", {
      data: {
        id: "acc-inactive",
        clerk_user_id: "clerk-user-inactive",
        tier: "free",
        is_active: false,
      },
      error: null,
    });

    const req = createTestRequest("POST", "/api/auth/verify");
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Account deactivated");
    expect(json.code).toBe("ACCOUNT_DEACTIVATED");
  });

  it("response includes userId and account data", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk-user-123" } as any);

    setResult("accounts", {
      data: {
        id: "acc-123",
        clerk_user_id: "clerk-user-123",
        tier: "free",
        token_limit: 50000,
        is_active: true,
      },
      error: null,
    });

    const req = createTestRequest("POST", "/api/auth/verify");
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveProperty("userId");
    expect(json.data).toHaveProperty("account");
    expect(json.data.account).toHaveProperty("id");
    expect(json.data.account).toHaveProperty("tier");
  });

  it("handles Clerk user lookup for new accounts", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "clerk-user-new" } as any);

    const mockClerkClient = {
      users: {
        getUser: vi.fn().mockResolvedValue({
          firstName: "John",
          lastName: "Doe",
          emailAddresses: [{ emailAddress: "john@example.com" }],
        }),
      },
    };
    vi.mocked(clerkClient).mockResolvedValue(mockClerkClient as any);

    // No existing account
    setResult("accounts", { data: null, error: { code: "PGRST116" } });

    // New account after insert
    setResult("accounts", {
      data: {
        id: "acc-new",
        clerk_user_id: "clerk-user-new",
        name: "John Doe",
        email: "john@example.com",
        tier: "free",
        token_limit: 50000,
        is_active: true,
      },
      error: null,
    });

    const req = createTestRequest("POST", "/api/auth/verify");
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(mockClerkClient.users.getUser).toHaveBeenCalledWith("clerk-user-new");
    expect(json.data.account.name).toBe("John Doe");
    expect(json.data.account.email).toBe("john@example.com");
  });
});
