import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createMockSupabase } from "@/__tests__/helpers/mock-supabase";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/desktop-auth", () => ({
  validateAccessToken: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

// ── Imports (after mocks) ────────────────────────────────────────────────────

import { validateAccessToken } from "@/lib/desktop-auth";
import { createSupabaseAdmin } from "@/lib/supabase/server";

import {
  GET as chatsGet,
  POST as chatsPost,
  DELETE as chatsDelete,
} from "@/app/api/desktop/sync/chats/route";
import {
  GET as messagesGet,
  POST as messagesPost,
} from "@/app/api/desktop/sync/messages/route";
import { POST as pushPost } from "@/app/api/desktop/sync/push/route";

// ── Helpers ──────────────────────────────────────────────────────────────────

function createBearerRequest(
  method: string,
  url: string,
  body?: Record<string, unknown>
): NextRequest {
  const headers: Record<string, string> = {
    Authorization: "Bearer test-access-token",
  };
  const init: RequestInit = { method, headers };
  if (body) {
    init.body = JSON.stringify(body);
    headers["Content-Type"] = "application/json";
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), init as never);
}

function createPlainRequest(
  method: string,
  url: string,
  body?: Record<string, unknown>
): NextRequest {
  const init: RequestInit = { method };
  if (body) {
    init.body = JSON.stringify(body);
    init.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), init as never);
}

const TOKEN_DATA = {
  sub: "clerk-user-sync",
  account_id: "acc-sync-100",
  session_id: "session-sync-1",
  tier: "pro",
  token_limit: 500000,
  tokens_used: 3000,
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe("Desktop Sync API Routes", () => {
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
  // GET /api/desktop/sync/chats
  // ════════════════════════════════════════════════════════════════════════════

  describe("GET /api/desktop/sync/chats", () => {
    it("returns 401 when no auth header", async () => {
      const req = createPlainRequest("GET", "/api/desktop/sync/chats");
      const res = await chatsGet(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error).toBe("Authorization header required");
    });

    it("returns chats list successfully", async () => {
      vi.mocked(validateAccessToken).mockReturnValue(TOKEN_DATA);

      const chatsList = [
        { id: "chat-1", title: "Chat One", mode: "chat", updated_at: "2026-02-26T00:00:00Z" },
        { id: "chat-2", title: "Chat Two", mode: "agent", updated_at: "2026-02-25T00:00:00Z" },
      ];
      setResult("chats", { data: chatsList, error: null });

      const req = createBearerRequest("GET", "/api/desktop/sync/chats");
      const res = await chatsGet(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.chats).toHaveLength(2);
      expect(json.chats[0].id).toBe("chat-1");
      expect(json.chats[1].id).toBe("chat-2");

      expect(supabase.from).toHaveBeenCalledWith("chats");
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // POST /api/desktop/sync/chats
  // ════════════════════════════════════════════════════════════════════════════

  describe("POST /api/desktop/sync/chats", () => {
    it("returns 401 when no auth header", async () => {
      const req = createPlainRequest("POST", "/api/desktop/sync/chats", {
        title: "New Chat",
      });
      const res = await chatsPost(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error).toBe("Authorization header required");
    });

    it("creates new chat successfully", async () => {
      vi.mocked(validateAccessToken).mockReturnValue(TOKEN_DATA);

      const newChat = {
        id: "chat-new-1",
        account_id: "acc-sync-100",
        title: "New Chat",
        mode: "chat",
        device_origin: "desktop",
      };

      // Insert result
      setResult("chats", { data: newChat, error: null });

      const req = createBearerRequest("POST", "/api/desktop/sync/chats", {
        title: "New Chat",
        mode: "chat",
        device_origin: "desktop",
      });
      const res = await chatsPost(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.chat.id).toBe("chat-new-1");
      expect(json.chat.title).toBe("New Chat");
      expect(json.action).toBe("created");
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // DELETE /api/desktop/sync/chats
  // ════════════════════════════════════════════════════════════════════════════

  describe("DELETE /api/desktop/sync/chats", () => {
    it("returns 401 when no auth header", async () => {
      const req = createPlainRequest(
        "DELETE",
        "/api/desktop/sync/chats?chat_id=chat-1"
      );
      const res = await chatsDelete(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error).toBe("Authorization header required");
    });

    it("returns 400 when missing chat_id", async () => {
      vi.mocked(validateAccessToken).mockReturnValue(TOKEN_DATA);

      const req = createBearerRequest("DELETE", "/api/desktop/sync/chats");
      const res = await chatsDelete(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toBe("chat_id is required");
    });

    it("deletes chat successfully", async () => {
      vi.mocked(validateAccessToken).mockReturnValue(TOKEN_DATA);

      // Verify chat exists and belongs to account
      setResult("chats", {
        data: { id: "chat-del-1" },
        error: null,
      });

      // Soft delete update
      setResult("chats", { data: null, error: null });

      const req = createBearerRequest(
        "DELETE",
        "/api/desktop/sync/chats?chat_id=chat-del-1"
      );
      const res = await chatsDelete(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.deleted).toBe(true);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // GET /api/desktop/sync/messages
  // ════════════════════════════════════════════════════════════════════════════

  describe("GET /api/desktop/sync/messages", () => {
    it("returns 401 when no auth header", async () => {
      const req = createPlainRequest(
        "GET",
        "/api/desktop/sync/messages?chat_id=chat-1"
      );
      const res = await messagesGet(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error).toBe("Authorization header required");
    });

    it("returns 400 when missing chat_id", async () => {
      vi.mocked(validateAccessToken).mockReturnValue(TOKEN_DATA);

      const req = createBearerRequest("GET", "/api/desktop/sync/messages");
      const res = await messagesGet(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toBe("chat_id is required");
    });

    it("returns messages successfully", async () => {
      vi.mocked(validateAccessToken).mockReturnValue(TOKEN_DATA);

      // Chat ownership check
      setResult("chats", {
        data: { id: "chat-msg-1", account_id: "acc-sync-100" },
        error: null,
      });

      // Messages list
      const messagesList = [
        { id: "msg-1", chat_id: "chat-msg-1", role: "user", content: "Hello", created_at: "2026-02-26T00:00:00Z" },
        { id: "msg-2", chat_id: "chat-msg-1", role: "assistant", content: "Hi there!", created_at: "2026-02-26T00:01:00Z" },
      ];
      setResult("messages", { data: messagesList, error: null });

      const req = createBearerRequest(
        "GET",
        "/api/desktop/sync/messages?chat_id=chat-msg-1"
      );
      const res = await messagesGet(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.messages).toHaveLength(2);
      expect(json.messages[0].role).toBe("user");
      expect(json.messages[1].role).toBe("assistant");
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // POST /api/desktop/sync/messages
  // ════════════════════════════════════════════════════════════════════════════

  describe("POST /api/desktop/sync/messages", () => {
    it("returns 401 when no auth header", async () => {
      const req = createPlainRequest("POST", "/api/desktop/sync/messages", {
        chat_id: "chat-1",
        role: "user",
        content: "Hello",
      });
      const res = await messagesPost(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error).toBe("Authorization header required");
    });

    it("returns 400 when missing required fields", async () => {
      vi.mocked(validateAccessToken).mockReturnValue(TOKEN_DATA);

      const req = createBearerRequest("POST", "/api/desktop/sync/messages", {
        chat_id: "chat-1",
        // missing role and content
      });
      const res = await messagesPost(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toBe("chat_id, role, and content are required");
    });

    it("creates message successfully", async () => {
      vi.mocked(validateAccessToken).mockReturnValue(TOKEN_DATA);

      // Chat ownership check
      setResult("chats", {
        data: { id: "chat-msg-2", account_id: "acc-sync-100" },
        error: null,
      });

      // Message insert
      const newMsg = {
        id: "msg-new-1",
        chat_id: "chat-msg-2",
        role: "user",
        content: "Hello world",
        message_type: "text",
        tokens_used: 0,
      };
      setResult("messages", { data: newMsg, error: null });

      // Chat updated_at update
      setResult("chats", { data: null, error: null });

      const req = createBearerRequest("POST", "/api/desktop/sync/messages", {
        chat_id: "chat-msg-2",
        role: "user",
        content: "Hello world",
      });
      const res = await messagesPost(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.message.id).toBe("msg-new-1");
      expect(json.message.content).toBe("Hello world");
      expect(json.action).toBe("created");
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // POST /api/desktop/sync/push
  // ════════════════════════════════════════════════════════════════════════════

  describe("POST /api/desktop/sync/push", () => {
    it("returns 401 when no auth header", async () => {
      const req = createPlainRequest("POST", "/api/desktop/sync/push", {
        action: "create",
        type: "chat",
        data: { title: "test" },
      });
      const res = await pushPost(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error).toBe("Authorization header required");
    });

    it("returns 400 when missing required fields", async () => {
      vi.mocked(validateAccessToken).mockReturnValue(TOKEN_DATA);

      const req = createBearerRequest("POST", "/api/desktop/sync/push", {
        action: "create",
        // missing type and data
      });
      const res = await pushPost(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toBe("action, type, and data are required");
    });
  });
});
