import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/teams/route";
import { GET, PATCH, DELETE } from "@/app/api/teams/[id]/route";
import { NextResponse } from "next/server";
import { createMockSupabase } from "@/__tests__/helpers/mock-supabase";
import { createTestRequest, mockParams, mockTeamContext, mockAuthError, mockNoPermContext } from "@/__tests__/helpers/mock-context";

// Mock Supabase
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: vi.fn(),
}));

// Mock helpers for POST /api/teams
vi.mock("@/lib/crm/helpers", () => ({
  getAccountId: vi.fn(),
  isValidUUID: vi.fn((str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)),
}));

// Mock team helpers for [id] routes
vi.mock("@/lib/crm/team-helpers", () => ({
  getTeamContext: vi.fn(),
  requirePermission: vi.fn(),
}));

// Mock Stripe
vi.mock("@/lib/stripe/server", () => ({
  cancelSubscriptionImmediately: vi.fn(),
}));

import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getAccountId } from "@/lib/crm/helpers";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { cancelSubscriptionImmediately } from "@/lib/stripe/server";

describe("POST /api/teams", () => {
  let supabase: ReturnType<typeof createMockSupabase>["supabase"];
  let setResult: ReturnType<typeof createMockSupabase>["setResult"];
  let setRpcResult: ReturnType<typeof createMockSupabase>["setRpcResult"];

  beforeEach(() => {
    vi.clearAllMocks();
    const mock = createMockSupabase();
    supabase = mock.supabase;
    setResult = mock.setResult;
    setRpcResult = mock.setRpcResult;
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);
  });

  it("creates team successfully", async () => {
    vi.mocked(getAccountId).mockResolvedValue({ accountId: "acc-123", error: null });

    // Mock: no existing team
    setResult("teams", { data: null, error: { code: "PGRST116" } });

    // Mock RPC call
    setRpcResult("create_team_with_defaults", { data: "team-new-123", error: null });

    // Mock account tier
    setResult("accounts", { data: { id: "acc-123", tier: "free" }, error: null });

    // Mock final team retrieval
    setResult("teams", {
      data: { id: "team-new-123", name: "Test Team", owner_account_id: "acc-123", max_members: 3 },
      error: null,
    });

    const req = createTestRequest("POST", "/api/teams", { name: "Test Team" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.id).toBe("team-new-123");
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getAccountId).mockResolvedValue({
      accountId: null,
      error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }),
    });

    const req = createTestRequest("POST", "/api/teams", { name: "Test Team" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
  });

  it("returns 400 on invalid input (missing name)", async () => {
    vi.mocked(getAccountId).mockResolvedValue({ accountId: "acc-123", error: null });

    const req = createTestRequest("POST", "/api/teams", {});
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toContain("Invalid input");
  });

  it("returns 409 if owner already has active team", async () => {
    vi.mocked(getAccountId).mockResolvedValue({ accountId: "acc-123", error: null });

    // Mock existing team
    setResult("teams", { data: { id: "team-existing-123" }, error: null });

    const req = createTestRequest("POST", "/api/teams", { name: "Test Team" });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.success).toBe(false);
    expect(json.error).toContain("You can only own one team");
  });
});

describe("GET /api/teams/[id]", () => {
  let supabase: ReturnType<typeof createMockSupabase>["supabase"];
  let setResult: ReturnType<typeof createMockSupabase>["setResult"];

  beforeEach(() => {
    vi.clearAllMocks();
    const mock = createMockSupabase();
    supabase = mock.supabase;
    setResult = mock.setResult;
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);
  });

  it("returns team data", async () => {
    const ctx = mockTeamContext();
    vi.mocked(getTeamContext).mockResolvedValue(ctx as any);

    setResult("teams", {
      data: { id: "ws-test-456", name: "Test Team", owner_account_id: "acc-test-123" },
      error: null,
    });

    const req = createTestRequest("GET", "/api/teams/ws-test-456");
    const res = await GET(req, mockParams("ws-test-456"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.id).toBe("ws-test-456");
  });

  it("returns 403 when accessing other team", async () => {
    const ctx = mockTeamContext({ teamId: "ws-test-456" });
    vi.mocked(getTeamContext).mockResolvedValue(ctx as any);

    const req = createTestRequest("GET", "/api/teams/ws-other-999");
    const res = await GET(req, mockParams("ws-other-999"));
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.success).toBe(false);
    expect(json.error).toContain("Access denied");
  });
});

describe("PATCH /api/teams/[id]", () => {
  let supabase: ReturnType<typeof createMockSupabase>["supabase"];
  let setResult: ReturnType<typeof createMockSupabase>["setResult"];

  beforeEach(() => {
    vi.clearAllMocks();
    const mock = createMockSupabase();
    supabase = mock.supabase;
    setResult = mock.setResult;
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);
  });

  it("updates team settings", async () => {
    const ctx = mockTeamContext();
    vi.mocked(getTeamContext).mockResolvedValue(ctx as any);
    vi.mocked(requirePermission).mockReturnValue(null);

    setResult("teams", {
      data: { id: "ws-test-456", name: "Updated Team" },
      error: null,
    });

    const req = createTestRequest("PATCH", "/api/teams/ws-test-456", { name: "Updated Team" });
    const res = await PATCH(req, mockParams("ws-test-456"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.name).toBe("Updated Team");
  });

  it("returns 403 when no manage permission", async () => {
    const ctx = mockNoPermContext();
    vi.mocked(getTeamContext).mockResolvedValue(ctx as any);
    vi.mocked(requirePermission).mockReturnValue(
      NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    );

    const req = createTestRequest("PATCH", "/api/teams/ws-test-456", { name: "Updated Team" });
    const res = await PATCH(req, mockParams("ws-test-456"));
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.success).toBe(false);
  });
});

describe("DELETE /api/teams/[id]", () => {
  let supabase: ReturnType<typeof createMockSupabase>["supabase"];
  let setResult: ReturnType<typeof createMockSupabase>["setResult"];

  beforeEach(() => {
    vi.clearAllMocks();
    const mock = createMockSupabase();
    supabase = mock.supabase;
    setResult = mock.setResult;
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);
  });

  it("soft-deletes team and calls cancelSubscriptionImmediately", async () => {
    const ctx = mockTeamContext({ isDirector: true });
    vi.mocked(getTeamContext).mockResolvedValue(ctx as any);
    vi.mocked(cancelSubscriptionImmediately).mockResolvedValue(undefined);

    // Mock team with subscription
    setResult("teams", {
      data: { id: "ws-test-456", stripe_subscription_id: "sub_123" },
      error: null,
    });

    // Mock members lookup
    setResult("team_members", { data: [], error: null });

    const req = createTestRequest("DELETE", "/api/teams/ws-test-456");
    const res = await DELETE(req, mockParams("ws-test-456"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(cancelSubscriptionImmediately).toHaveBeenCalledWith("sub_123");
  });

  it("returns 403 if not director", async () => {
    const ctx = mockTeamContext({ isDirector: false });
    vi.mocked(getTeamContext).mockResolvedValue(ctx as any);

    const req = createTestRequest("DELETE", "/api/teams/ws-test-456");
    const res = await DELETE(req, mockParams("ws-test-456"));
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.success).toBe(false);
    expect(json.error).toContain("Only the director can delete a team");
  });
});
