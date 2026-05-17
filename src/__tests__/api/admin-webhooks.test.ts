import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: vi.fn(),
}));
vi.mock("@/lib/crm/team-helpers", () => {
  const getTeamContext = vi.fn();
  return { getTeamContext, getWorkspaceContext: getTeamContext, requirePermission: vi.fn() };
});
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { GET, POST } from "@/app/api/admin/webhooks/route";
import { GET as GET_BY_ID, PATCH, DELETE } from "@/app/api/admin/webhooks/[id]/route";
import { POST as ROTATE_SECRET } from "@/app/api/admin/webhooks/[id]/rotate-secret/route";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { createMockSupabase } from "../helpers/mock-supabase";
import { decryptWebhookSecret, verifyWebhookSignature, signWebhookBody } from "@/lib/webhooks/signing";
import {
  mockTeamContext,
  mockNoPermContext,
  createTestRequest,
  mockParams,
} from "../helpers/mock-context";

const VALID_ID = "11111111-1111-1111-1111-111111111111";

describe("GET /api/admin/webhooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requirePermission).mockReturnValue(null);
  });

  it("returns list without secret_encrypted", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());
    const { supabase, setResult } = createMockSupabase();
    const rows = [
      { id: VALID_ID, name: "test", url: "https://api.example.com", event_types: ["*"], is_active: true },
    ];
    setResult("webhook_endpoints", { data: rows, count: 1 });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    const response = await GET(createTestRequest("GET", "/api/admin/webhooks"));
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    for (const row of json.data) {
      expect(row).not.toHaveProperty("secret_encrypted");
      expect(row).not.toHaveProperty("secret_hash");
    }
  });

  it("returns 403 without team_settings:read", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockNoPermContext());
    const { NextResponse } = await import("next/server");
    vi.mocked(requirePermission).mockReturnValue(
      NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }),
    );
    const response = await GET(createTestRequest("GET", "/api/admin/webhooks"));
    expect(response.status).toBe(403);
  });
});

describe("POST /api/admin/webhooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requirePermission).mockReturnValue(null);
  });

  it("creates endpoint and returns plaintext exactly once", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());
    const { supabase, setResult } = createMockSupabase();
    const inserted = {
      id: VALID_ID,
      name: "test",
      url: "https://api.example.com",
      event_types: ["*"],
      is_active: true,
    };
    setResult("webhook_endpoints", { data: inserted, error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    const req = createTestRequest("POST", "/api/admin/webhooks", {
      name: "test",
      url: "https://api.example.com",
      event_types: ["*"],
    });
    const response = await POST(req);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.plaintext).toMatch(/^whsec_/);
    // Plaintext is returned but the encrypted column is NOT in the response.
    expect(json.data).not.toHaveProperty("secret_encrypted");
    expect(json.data).not.toHaveProperty("secret_hash");
  });

  it("rejects loopback URL with 400", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());
    const { supabase } = createMockSupabase();
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);
    const req = createTestRequest("POST", "/api/admin/webhooks", {
      url: "https://localhost",
      event_types: ["*"],
    });
    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("returns 403 without team_settings:manage", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockNoPermContext());
    const { NextResponse } = await import("next/server");
    vi.mocked(requirePermission).mockReturnValue(
      NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }),
    );
    const req = createTestRequest("POST", "/api/admin/webhooks", {
      url: "https://api.example.com",
      event_types: ["*"],
    });
    const response = await POST(req);
    expect(response.status).toBe(403);
  });
});

describe("GET /api/admin/webhooks/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requirePermission).mockReturnValue(null);
  });

  it("returns 400 on invalid uuid", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());
    const response = await GET_BY_ID(createTestRequest("GET", "/api/admin/webhooks/x"), mockParams("not-a-uuid"));
    expect(response.status).toBe(400);
  });

  it("returns 404 when not found", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());
    const { supabase, setResult } = createMockSupabase();
    setResult("webhook_endpoints", { data: null, error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);
    const response = await GET_BY_ID(
      createTestRequest("GET", `/api/admin/webhooks/${VALID_ID}`),
      mockParams(VALID_ID),
    );
    expect(response.status).toBe(404);
  });

  it("returns endpoint without secret fields", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());
    const { supabase, setResult } = createMockSupabase();
    setResult("webhook_endpoints", {
      data: { id: VALID_ID, url: "https://api.example.com", event_types: ["*"], is_active: true },
      error: null,
    });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);
    const response = await GET_BY_ID(
      createTestRequest("GET", `/api/admin/webhooks/${VALID_ID}`),
      mockParams(VALID_ID),
    );
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.data).not.toHaveProperty("secret_encrypted");
  });
});

describe("PATCH /api/admin/webhooks/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requirePermission).mockReturnValue(null);
  });

  it("updates is_active", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());
    const { supabase, setResult } = createMockSupabase();
    setResult("webhook_endpoints", {
      data: { id: VALID_ID, is_active: false, url: "https://api.example.com", event_types: ["*"] },
      error: null,
    });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);
    const response = await PATCH(
      createTestRequest("PATCH", `/api/admin/webhooks/${VALID_ID}`, { is_active: false }),
      mockParams(VALID_ID),
    );
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.data.is_active).toBe(false);
  });

  it("rejects empty body", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());
    const response = await PATCH(
      createTestRequest("PATCH", `/api/admin/webhooks/${VALID_ID}`, {}),
      mockParams(VALID_ID),
    );
    expect(response.status).toBe(400);
  });
});

describe("DELETE /api/admin/webhooks/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requirePermission).mockReturnValue(null);
  });

  it("deactivates (not hard-deletes) and returns 200", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());
    const { supabase, setResult, chain } = createMockSupabase();
    setResult("webhook_endpoints", { data: { id: VALID_ID, is_active: true }, error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);
    const response = await DELETE(
      createTestRequest("DELETE", `/api/admin/webhooks/${VALID_ID}`),
      mockParams(VALID_ID),
    );
    expect(response.status).toBe(200);
    // Verify it used .update({is_active:false}), not .delete()
    expect(chain.update).toHaveBeenCalledWith({ is_active: false });
    expect(chain.delete).not.toHaveBeenCalled();
  });

  it("returns 400 if already inactive", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());
    const { supabase, setResult } = createMockSupabase();
    setResult("webhook_endpoints", { data: { id: VALID_ID, is_active: false }, error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);
    const response = await DELETE(
      createTestRequest("DELETE", `/api/admin/webhooks/${VALID_ID}`),
      mockParams(VALID_ID),
    );
    expect(response.status).toBe(400);
  });
});

describe("POST /api/admin/webhooks/[id]/rotate-secret", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requirePermission).mockReturnValue(null);
  });

  it("returns a new plaintext that decrypts back from the stored value", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());
    const { supabase, setResult, chain } = createMockSupabase();
    setResult("webhook_endpoints", { data: { id: VALID_ID }, error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    const response = await ROTATE_SECRET(
      createTestRequest("POST", `/api/admin/webhooks/${VALID_ID}/rotate-secret`),
      mockParams(VALID_ID),
    );
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.data.plaintext).toMatch(/^whsec_/);

    // The update payload contains the encrypted form, and it decrypts to the
    // plaintext we returned.
    const updateMock = chain.update as unknown as { mock: { calls: unknown[][] } };
    const updatePayload = updateMock.mock.calls[0]?.[0] as { secret_encrypted: string };
    expect(updatePayload.secret_encrypted).toBeDefined();
    expect(updatePayload.secret_encrypted).not.toBe(json.data.plaintext);
    expect(decryptWebhookSecret(updatePayload.secret_encrypted)).toBe(json.data.plaintext);
  });

  it("HMAC produced with new secret rejects signature of old secret", () => {
    const body = '{"id":"abc"}';
    const oldSig = signWebhookBody("whsec_OLDsecret", body);
    expect(verifyWebhookSignature("whsec_NEWsecret", body, oldSig)).toBe(false);
  });
});
