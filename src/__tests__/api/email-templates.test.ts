import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all dependencies BEFORE importing the routes
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: vi.fn(),
}));
vi.mock("@/lib/crm/team-helpers", () => {
  const f = vi.fn();
  return { getTeamContext: f, getWorkspaceContext: f, requirePermission: vi.fn() };
});
vi.mock("@/lib/usage/feature-limits", () => ({
  requireFeatureLimit: vi.fn(),
}));
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { GET, POST } from "@/app/api/crm/email-templates/route";
import { PATCH, DELETE } from "@/app/api/crm/email-templates/[id]/route";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { requireFeatureLimit } from "@/lib/usage/feature-limits";
import { createMockSupabase } from "../helpers/mock-supabase";
import {
  mockTeamContext,
  mockAuthError,
  createTestRequest,
  mockParams,
} from "../helpers/mock-context";

// ── Helpers ──────────────────────────────────────────────────────────────────

const UUID = "550e8400-e29b-41d4-a716-446655440000";

const validTemplateBody = {
  name: "Welcome Email",
  subject: "Welcome to our platform!",
  body: "<h1>Welcome!</h1><p>We are glad to have you.</p>",
  category: "onboarding",
};

// ── GET /api/crm/email-templates ────────────────────────────────────────────

describe("GET /api/crm/email-templates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requirePermission).mockReturnValue(null);
  });

  it("returns templates list", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    const mockTemplates = [
      { id: "t1", name: "Welcome Email", subject: "Welcome!", body: "<p>Hi</p>" },
      { id: "t2", name: "Follow Up", subject: "Checking in", body: "<p>Hello again</p>" },
    ];
    setResult("email_templates", { data: mockTemplates });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);

    const request = createTestRequest("GET", "/api/crm/email-templates");
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual(mockTemplates);
    expect(json.data).toHaveLength(2);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockAuthError());

    const request = createTestRequest("GET", "/api/crm/email-templates");
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.success).toBe(false);
  });

  it("returns empty array when no templates exist", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    setResult("email_templates", { data: [] });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);

    const request = createTestRequest("GET", "/api/crm/email-templates");
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual([]);
  });
});

// ── POST /api/crm/email-templates ──────────────────────────────────────────

describe("POST /api/crm/email-templates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requirePermission).mockReturnValue(null);
    vi.mocked(requireFeatureLimit).mockResolvedValue(null);
  });

  it("creates template with valid data", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult, chain } = createMockSupabase();
    const newTemplate = {
      id: "t-new",
      ...validTemplateBody,
      team_id: "ws-test-456",
      account_id: "acc-test-123",
    };
    setResult("email_templates", { data: newTemplate, error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);

    const request = createTestRequest("POST", "/api/crm/email-templates", validTemplateBody);
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual(newTemplate);

    // Verify team_id and account_id are set correctly
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        team_id: "ws-test-456",
        account_id: "acc-test-123",
      })
    );
  });

  it("returns 400 when name is missing", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { name, ...bodyWithoutName } = validTemplateBody;
    const request = createTestRequest("POST", "/api/crm/email-templates", bodyWithoutName);
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Invalid input");
  });

  it("returns 400 when body is missing", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { body: _body, ...bodyWithoutBody } = validTemplateBody;
    const request = createTestRequest("POST", "/api/crm/email-templates", bodyWithoutBody);
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Invalid input");
  });

  it("returns 403 when feature limit exceeded", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());
    const { NextResponse } = await import("next/server");
    vi.mocked(requireFeatureLimit).mockResolvedValue(
      NextResponse.json({ success: false, error: "Feature limit exceeded" }, { status: 403 })
    );

    const request = createTestRequest("POST", "/api/crm/email-templates", validTemplateBody);
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.success).toBe(false);
  });
});

// ── PATCH /api/crm/email-templates/[id] ─────────────────────────────────────

describe("PATCH /api/crm/email-templates/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requirePermission).mockReturnValue(null);
  });

  it("updates template with valid data", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    const updated = { id: UUID, name: "Updated Welcome", subject: "Hello!", body: "<p>Updated</p>" };
    setResult("email_templates", { data: updated, error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);

    const request = createTestRequest("PATCH", `/api/crm/email-templates/${UUID}`, {
      name: "Updated Welcome",
      subject: "Hello!",
    });
    const response = await PATCH(request, mockParams(UUID));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual(updated);
  });

  it("returns 403 when no permission", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());
    const { NextResponse } = await import("next/server");
    vi.mocked(requirePermission).mockReturnValue(
      NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    );

    const request = createTestRequest("PATCH", `/api/crm/email-templates/${UUID}`, {
      name: "Updated",
    });
    const response = await PATCH(request, mockParams(UUID));
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.success).toBe(false);
  });
});

// ── DELETE /api/crm/email-templates/[id] ────────────────────────────────────

describe("DELETE /api/crm/email-templates/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requirePermission).mockReturnValue(null);
  });

  it("deletes template successfully", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    setResult("email_templates", { data: null, error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);

    const request = createTestRequest("DELETE", `/api/crm/email-templates/${UUID}`);
    const response = await DELETE(request, mockParams(UUID));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it("returns 403 when no permission", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());
    const { NextResponse } = await import("next/server");
    vi.mocked(requirePermission).mockReturnValue(
      NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    );

    const request = createTestRequest("DELETE", `/api/crm/email-templates/${UUID}`);
    const response = await DELETE(request, mockParams(UUID));
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.success).toBe(false);
  });
});
