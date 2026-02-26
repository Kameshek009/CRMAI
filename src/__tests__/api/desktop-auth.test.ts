import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createMockSupabase } from "@/__tests__/helpers/mock-supabase";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
  clerkClient: vi.fn(),
}));

vi.mock("@/lib/desktop-auth", () => ({
  generateDesktopTokens: vi.fn(),
  validateAccessToken: vi.fn(),
  refreshDesktopToken: vi.fn(),
  revokeRefreshToken: vi.fn(),
  validateAuthCode: vi.fn(),
  getOrCreateAccount: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

// ── Imports (after mocks) ────────────────────────────────────────────────────

import { auth, currentUser, clerkClient } from "@clerk/nextjs/server";

type AuthReturn = Awaited<ReturnType<typeof auth>>;
type CurrentUserReturn = Awaited<ReturnType<typeof currentUser>>;
type ClerkClientReturn = Awaited<ReturnType<typeof clerkClient>>;
import {
  generateDesktopTokens,
  validateAccessToken,
  refreshDesktopToken,
  revokeRefreshToken,
  validateAuthCode,
  getOrCreateAccount,
} from "@/lib/desktop-auth";
import { createSupabaseAdmin } from "@/lib/supabase/server";

import { POST as authorizePost } from "@/app/api/auth/desktop/authorize/route";
import { POST as tokenPost } from "@/app/api/auth/desktop/token/route";
import { GET as meGet } from "@/app/api/auth/desktop/me/route";
import { POST as refreshPost } from "@/app/api/auth/desktop/refresh/route";
import { POST as heartbeatPost } from "@/app/api/auth/desktop/heartbeat/route";
import { POST as revokePost } from "@/app/api/auth/desktop/revoke/route";

// ── Helpers ──────────────────────────────────────────────────────────────────

function createJsonRequest(
  method: string,
  url: string,
  body?: Record<string, unknown>,
  headers?: Record<string, string>
): NextRequest {
  const init: RequestInit = { method, headers: { ...headers } };
  if (body) {
    init.body = JSON.stringify(body);
    (init.headers as Record<string, string>)["Content-Type"] = "application/json";
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

function createBearerRequest(
  method: string,
  url: string,
  body?: Record<string, unknown>
): NextRequest {
  return createJsonRequest(method, url, body, {
    Authorization: "Bearer test-access-token",
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("Desktop Auth API Routes", () => {
  let supabase: ReturnType<typeof createMockSupabase>["supabase"];
  let setResult: ReturnType<typeof createMockSupabase>["setResult"];

  beforeEach(() => {
    vi.clearAllMocks();
    const mock = createMockSupabase();
    supabase = mock.supabase;
    setResult = mock.setResult;
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);
  });

  // ════════════════════════════════════════════════════════════════════════════
  // POST /api/auth/desktop/authorize
  // ════════════════════════════════════════════════════════════════════════════

  describe("POST /api/auth/desktop/authorize", () => {
    it("returns 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as unknown as AuthReturn);

      const req = createJsonRequest("POST", "/api/auth/desktop/authorize", {
        state: "random-state",
      });
      const res = await authorizePost(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error).toBe("Not authenticated");
    });

    it("returns 400 when missing state", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: "clerk-user-1" } as unknown as AuthReturn);
      vi.mocked(currentUser).mockResolvedValue({
        firstName: "Test",
        lastName: "User",
        username: "testuser",
        emailAddresses: [{ emailAddress: "test@example.com" }],
        imageUrl: "https://img.clerk.com/avatar.png",
      } as unknown as CurrentUserReturn);

      const req = createJsonRequest("POST", "/api/auth/desktop/authorize", {});
      const res = await authorizePost(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toBe("State parameter is required");
    });

    it("authorizes successfully when account found", async () => {
      vi.mocked(auth).mockResolvedValue({ userId: "clerk-user-1" } as unknown as AuthReturn);
      vi.mocked(currentUser).mockResolvedValue({
        firstName: "Test",
        lastName: "User",
        username: "testuser",
        emailAddresses: [{ emailAddress: "test@example.com" }],
        imageUrl: "https://img.clerk.com/avatar.png",
      } as unknown as CurrentUserReturn);

      // Existing account found
      setResult("accounts", {
        data: {
          id: "acc-100",
          clerk_user_id: "clerk-user-1",
          tier: "pro",
          token_limit: 500000,
          tokens_used: 1200,
          billing_cycle_start: "2026-01-01T00:00:00.000Z",
          current_team_id: null,
        },
        error: null,
      });

      // Update call (account exists, so update email/name)
      setResult("accounts", { data: null, error: null });

      vi.mocked(generateDesktopTokens).mockResolvedValue({
        accessToken: "jwt-access-token",
        refreshToken: "drt_refresh-token",
        expiresAt: "2026-02-26T02:00:00.000Z",
        sessionId: "session-001",
      });

      const req = createJsonRequest("POST", "/api/auth/desktop/authorize", {
        state: "random-state-abc",
        device_name: "MacBook Pro",
        device_id: "device-xyz",
      });
      const res = await authorizePost(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.access_token).toBe("jwt-access-token");
      expect(json.refresh_token).toBe("drt_refresh-token");
      expect(json.expires_in).toBe(3600);
      expect(json.user.id).toBe("clerk-user-1");
      expect(json.user.email).toBe("test@example.com");
      expect(json.account.id).toBe("acc-100");
      expect(json.account.tier).toBe("pro");

      expect(generateDesktopTokens).toHaveBeenCalledWith(
        "clerk-user-1",
        "acc-100",
        { tier: "pro", token_limit: 500000, tokens_used: 1200 },
        "MacBook Pro",
        "device-xyz",
        undefined,
        undefined
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // POST /api/auth/desktop/token
  // ════════════════════════════════════════════════════════════════════════════

  describe("POST /api/auth/desktop/token", () => {
    it("returns 400 when missing code", async () => {
      const req = createJsonRequest("POST", "/api/auth/desktop/token", {});
      const res = await tokenPost(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toBe("Authorization code is required");
    });

    it("returns 401 when invalid code", async () => {
      vi.mocked(validateAuthCode).mockResolvedValue(null);

      const req = createJsonRequest("POST", "/api/auth/desktop/token", {
        code: "dac_invalid-code",
      });
      const res = await tokenPost(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error).toBe("Invalid or expired authorization code");
    });

    it("exchanges code for tokens successfully", async () => {
      vi.mocked(validateAuthCode).mockResolvedValue({
        clerkUserId: "clerk-user-2",
        deviceName: "Windows PC",
        deviceId: "device-win-1",
      });

      vi.mocked(getOrCreateAccount).mockResolvedValue({
        id: "acc-200",
        current_team_id: "team-1",
        tier: "pro",
        token_limit: 500000,
        tokens_used: 300,
        billing_cycle_start: "2026-01-15T00:00:00.000Z",
        stripe_customer_id: null,
        stripe_subscription_id: null,
      });

      vi.mocked(generateDesktopTokens).mockResolvedValue({
        accessToken: "jwt-new-access",
        refreshToken: "drt_new-refresh",
        expiresAt: "2026-02-26T03:00:00.000Z",
        sessionId: "session-002",
      });

      const req = createJsonRequest("POST", "/api/auth/desktop/token", {
        code: "dac_valid-code-123",
        device_id: "device-win-1",
        device_name: "Windows PC",
      });
      const res = await tokenPost(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.accessToken).toBe("jwt-new-access");
      expect(json.data.refreshToken).toBe("drt_new-refresh");
      expect(json.data.sessionId).toBe("session-002");
      expect(json.data.account.id).toBe("acc-200");
      expect(json.data.account.tier).toBe("pro");
      expect(json.data.user.id).toBe("clerk-user-2");

      expect(validateAuthCode).toHaveBeenCalledWith("dac_valid-code-123");
      expect(getOrCreateAccount).toHaveBeenCalledWith("clerk-user-2");
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // GET /api/auth/desktop/me
  // ════════════════════════════════════════════════════════════════════════════

  describe("GET /api/auth/desktop/me", () => {
    it("returns 401 when no Authorization header", async () => {
      const req = new NextRequest(
        new URL("/api/auth/desktop/me", "http://localhost:3000"),
        { method: "GET" }
      );
      const res = await meGet(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error).toBe("Authorization header required");
    });

    it("returns 401 when invalid token", async () => {
      vi.mocked(validateAccessToken).mockReturnValue(null);

      const req = createBearerRequest("GET", "/api/auth/desktop/me");
      const res = await meGet(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error).toBe("Invalid or expired access token");
    });

    it("returns user info successfully", async () => {
      vi.mocked(validateAccessToken).mockReturnValue({
        sub: "clerk-user-3",
        account_id: "acc-300",
        session_id: "session-003",
        tier: "pro",
        token_limit: 500000,
        tokens_used: 5000,
      });

      // Account lookup
      setResult("accounts", {
        data: {
          id: "acc-300",
          current_team_id: "team-50",
          billing_cycle_start: "2026-01-01T00:00:00.000Z",
          stripe_customer_id: "cus_abc",
          stripe_subscription_id: "sub_xyz",
        },
        error: null,
      });

      // Team lookup
      setResult("teams", {
        data: { tier: "business", token_limit: 1000000, tokens_used: 10000 },
        error: null,
      });

      // Session lookup
      setResult("desktop_sessions", {
        data: {
          id: "session-003",
          device_name: "MacBook Pro",
          created_at: "2026-02-25T12:00:00.000Z",
          last_used_at: "2026-02-26T00:00:00.000Z",
          revoked: false,
        },
        error: null,
      });

      // Session update (last_used_at)
      setResult("desktop_sessions", { data: null, error: null });

      const mockClerkClient = {
        users: {
          getUser: vi.fn().mockResolvedValue({
            firstName: "Alice",
            lastName: "Smith",
            username: "asmith",
            emailAddresses: [{ emailAddress: "alice@example.com" }],
            imageUrl: "https://img.clerk.com/alice.png",
          }),
        },
      };
      vi.mocked(clerkClient).mockResolvedValue(mockClerkClient as unknown as ClerkClientReturn);

      const req = createBearerRequest("GET", "/api/auth/desktop/me");
      const res = await meGet(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.user.id).toBe("clerk-user-3");
      expect(json.data.user.email).toBe("alice@example.com");
      expect(json.data.user.name).toBe("Alice Smith");
      expect(json.data.account.id).toBe("acc-300");
      expect(json.data.account.tier).toBe("business");
      expect(json.data.session.id).toBe("session-003");

      expect(mockClerkClient.users.getUser).toHaveBeenCalledWith("clerk-user-3");
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // POST /api/auth/desktop/refresh
  // ════════════════════════════════════════════════════════════════════════════

  describe("POST /api/auth/desktop/refresh", () => {
    it("returns 400 when missing refreshToken", async () => {
      const req = createJsonRequest("POST", "/api/auth/desktop/refresh", {});
      const res = await refreshPost(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toBe("Refresh token is required");
    });

    it("returns 401 when invalid token", async () => {
      vi.mocked(refreshDesktopToken).mockResolvedValue(null);

      const req = createJsonRequest("POST", "/api/auth/desktop/refresh", {
        refreshToken: "drt_invalid-token",
      });
      const res = await refreshPost(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error).toBe("Invalid or expired refresh token");
    });

    it("refreshes successfully", async () => {
      vi.mocked(refreshDesktopToken).mockResolvedValue({
        accessToken: "jwt-refreshed-access",
        expiresAt: "2026-02-26T04:00:00.000Z",
        account: {
          id: "acc-400",
          tier: "pro",
          token_limit: 500000,
          tokens_used: 8000,
          billing_cycle_start: "2026-01-01T00:00:00.000Z",
        },
      });

      const req = createJsonRequest("POST", "/api/auth/desktop/refresh", {
        refreshToken: "drt_valid-refresh-token",
      });
      const res = await refreshPost(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.accessToken).toBe("jwt-refreshed-access");
      expect(json.data.expiresAt).toBe("2026-02-26T04:00:00.000Z");
      expect(json.data.account.id).toBe("acc-400");
      expect(json.data.account.tier).toBe("pro");

      expect(refreshDesktopToken).toHaveBeenCalledWith("drt_valid-refresh-token");
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // POST /api/auth/desktop/heartbeat
  // ════════════════════════════════════════════════════════════════════════════

  describe("POST /api/auth/desktop/heartbeat", () => {
    it("returns 401 when no Authorization header", async () => {
      const req = createJsonRequest("POST", "/api/auth/desktop/heartbeat");
      const res = await heartbeatPost(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error).toBe("Authorization header required");
    });

    it("returns 401 when invalid token", async () => {
      vi.mocked(validateAccessToken).mockReturnValue(null);

      const req = createBearerRequest("POST", "/api/auth/desktop/heartbeat");
      const res = await heartbeatPost(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error).toBe("Invalid or expired access token");
    });

    it("updates session successfully", async () => {
      vi.mocked(validateAccessToken).mockReturnValue({
        sub: "clerk-user-5",
        account_id: "acc-500",
        session_id: "session-005",
        tier: "pro",
        token_limit: 500000,
        tokens_used: 2000,
      });

      // Session update succeeds
      setResult("desktop_sessions", { data: null, error: null });

      const req = createBearerRequest("POST", "/api/auth/desktop/heartbeat");
      const res = await heartbeatPost(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toHaveProperty("last_used_at");

      expect(supabase.from).toHaveBeenCalledWith("desktop_sessions");
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // POST /api/auth/desktop/revoke
  // ════════════════════════════════════════════════════════════════════════════

  describe("POST /api/auth/desktop/revoke", () => {
    it("returns 400 when missing refreshToken", async () => {
      const req = createJsonRequest("POST", "/api/auth/desktop/revoke", {});
      const res = await revokePost(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toBe("Refresh token is required");
    });

    it("revokes successfully", async () => {
      vi.mocked(revokeRefreshToken).mockResolvedValue(true);

      const req = createJsonRequest("POST", "/api/auth/desktop/revoke", {
        refreshToken: "drt_token-to-revoke",
      });
      const res = await revokePost(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      expect(revokeRefreshToken).toHaveBeenCalledWith("drt_token-to-revoke");
    });
  });
});
