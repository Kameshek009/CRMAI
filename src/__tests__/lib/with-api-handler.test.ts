import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { z } from "zod";

// ── Mocks (hoisted) ──────────────────────────────────────────────────────

const { mockGetWorkspaceContext, mockRequirePermission, mockCheckRateLimit } = vi.hoisted(() => ({
  mockGetWorkspaceContext: vi.fn(),
  mockRequirePermission: vi.fn(),
  mockCheckRateLimit: vi.fn(),
}));

vi.mock("@/lib/crm/team-helpers", () => ({
  getWorkspaceContext: mockGetWorkspaceContext,
  requirePermission: mockRequirePermission,
}));

vi.mock("@/lib/usage/feature-limits", () => ({
  requireFeatureLimit: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mockCheckRateLimit,
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

// Must import AFTER mocks are set up
import { withApiHandler, ApiError } from "@/lib/crm/with-api-handler";

// ── Helpers ──────────────────────────────────────────────────────────────

const fakeContext = {
  accountId: "acc-1",
  clerkUserId: "clerk-1",
  workspaceId: "ws-1",
  tier: "pro" as const,
  permissions: {
    contacts: { read: true, create: true, update: true, delete: true },
    deals: { read: true, create: false, update: false, delete: false },
  },
  isOwner: false,
};

function makeRequest(
  url: string,
  options?: { method?: string; body?: unknown; headers?: Record<string, string> }
) {
  const init: RequestInit = {
    method: options?.method ?? "GET",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:3000",
      ...options?.headers,
    },
  };
  if (options?.body) {
    init.body = JSON.stringify(options.body);
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

// ── Setup ────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  mockGetWorkspaceContext.mockResolvedValue({ context: fakeContext, error: null });
  mockRequirePermission.mockReturnValue(null);
  mockCheckRateLimit.mockReturnValue(null);
});

// ── Tests ────────────────────────────────────────────────────────────────

describe("withApiHandler", () => {
  it("executes handler and returns response on success", async () => {
    const handler = withApiHandler({}, async () => {
      return new Response(JSON.stringify({ success: true, data: "ok" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }) as never;
    });

    const req = makeRequest("/api/test");
    const res = await handler(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("returns 403 for CSRF origin mismatch on POST", async () => {
    const handler = withApiHandler({}, async () => {
      return new Response(JSON.stringify({ success: true }), { status: 200 }) as never;
    });

    const req = makeRequest("/api/test", {
      method: "POST",
      body: {},
      headers: { origin: "https://evil.com" },
    });
    const res = await handler(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Cross-origin request denied");
  });

  it("allows same-origin POST requests", async () => {
    const handler = withApiHandler({}, async () => {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }) as never;
    });

    const req = makeRequest("/api/test", {
      method: "POST",
      body: {},
      headers: { origin: "http://localhost:3000" },
    });
    const res = await handler(req);
    expect(res.status).toBe(200);
  });

  it("returns 413 when content-length exceeds maxBodySize", async () => {
    const handler = withApiHandler({ maxBodySize: 100 }, async () => {
      return new Response(JSON.stringify({ success: true }), { status: 200 }) as never;
    });

    const req = makeRequest("/api/test", {
      method: "POST",
      body: {},
      headers: { origin: "http://localhost:3000", "content-length": "999999" },
    });
    const res = await handler(req);
    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.error).toBe("Request body too large");
  });

  it("returns 400 for invalid body when bodySchema is provided", async () => {
    const schema = z.object({ name: z.string().min(1) });
    const handler = withApiHandler({ bodySchema: schema }, async () => {
      return new Response(JSON.stringify({ success: true }), { status: 200 }) as never;
    });

    const req = makeRequest("/api/test", {
      method: "POST",
      body: { name: "" },
      headers: { origin: "http://localhost:3000" },
    });
    const res = await handler(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid input");
    expect(body.details).toBeDefined();
  });

  it("returns correct status when handler throws ApiError", async () => {
    const handler = withApiHandler({}, async () => {
      throw new ApiError("Not found", 404);
    });

    const req = makeRequest("/api/test");
    const res = await handler(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("Not found");
  });

  it("returns 500 for unhandled errors", async () => {
    const handler = withApiHandler({}, async () => {
      throw new Error("unexpected");
    });

    const req = makeRequest("/api/test");
    const res = await handler(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Internal server error");
  });

  it("calls checkRateLimit when rateLimit option is set", async () => {
    const handler = withApiHandler(
      { rateLimit: { limit: 10, windowMs: 60_000, keyPrefix: "test" } },
      async () => {
        return new Response(JSON.stringify({ success: true }), { status: 200 }) as never;
      }
    );

    const req = makeRequest("/api/test");
    await handler(req);
    expect(mockCheckRateLimit).toHaveBeenCalledWith(req, {
      limit: 10,
      windowMs: 60_000,
      keyPrefix: "test",
    });
  });
});
