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

import { GET, POST } from "@/app/api/crm/fields/route";
import { PATCH, DELETE } from "@/app/api/crm/fields/[id]/route";
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

const validFieldBody = {
  entity_type: "contact",
  field_key: "custom_score",
  label: "Custom Score",
  field_type: "number",
};

// ── GET /api/crm/fields ────────────────────────────────────────────────────

describe("GET /api/crm/fields", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns custom fields list", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    const mockFields = [
      { id: "f1", entity_type: "contact", field_key: "custom_score", label: "Score", field_type: "number" },
      { id: "f2", entity_type: "deal", field_key: "source", label: "Source", field_type: "select" },
    ];
    setResult("field_definitions", { data: mockFields });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    const request = createTestRequest("GET", "/api/crm/fields");
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual(mockFields);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockAuthError());

    const request = createTestRequest("GET", "/api/crm/fields");
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.success).toBe(false);
  });

  it("filters by entity_type when provided", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult, chain } = createMockSupabase();
    const mockFields = [
      { id: "f1", entity_type: "contact", field_key: "custom_score", label: "Score", field_type: "number" },
    ];
    setResult("field_definitions", { data: mockFields });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    const request = createTestRequest("GET", "/api/crm/fields?entity_type=contact");
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    // Verify that eq was called with entity_type filter
    expect(chain.eq).toHaveBeenCalledWith("entity_type", "contact");
  });
});

// ── POST /api/crm/fields ───────────────────────────────────────────────────

describe("POST /api/crm/fields", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requirePermission).mockReturnValue(null);
    vi.mocked(requireFeatureLimit).mockResolvedValue(null);
  });

  it("creates field with valid data", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    const newField = { id: "f-new", ...validFieldBody, team_id: "ws-test-456" };
    setResult("field_definitions", { data: newField, error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    const request = createTestRequest("POST", "/api/crm/fields", validFieldBody);
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual(newField);
  });

  it("returns 400 when field_key is invalid format", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const request = createTestRequest("POST", "/api/crm/fields", {
      ...validFieldBody,
      field_key: "InvalidKey!",
    });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Invalid input");
  });

  it("returns 409 when field key already exists (duplicate)", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    setResult("field_definitions", {
      data: null,
      error: { code: "23505", message: "duplicate key value" },
    });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    const request = createTestRequest("POST", "/api/crm/fields", validFieldBody);
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.success).toBe(false);
    expect(json.error).toBe("A field with this key already exists");
  });

  it("returns 403 when feature limit exceeded", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());
    const { NextResponse } = await import("next/server");
    vi.mocked(requireFeatureLimit).mockResolvedValue(
      NextResponse.json({ success: false, error: "Feature limit exceeded" }, { status: 403 })
    );

    const request = createTestRequest("POST", "/api/crm/fields", validFieldBody);
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.success).toBe(false);
  });
});

// ── PATCH /api/crm/fields/[id] ─────────────────────────────────────────────

describe("PATCH /api/crm/fields/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requirePermission).mockReturnValue(null);
  });

  it("updates field with valid data", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    const updatedField = { id: UUID, label: "Updated Label", field_type: "number" };
    setResult("field_definitions", { data: updatedField, error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    const request = createTestRequest("PATCH", `/api/crm/fields/${UUID}`, {
      label: "Updated Label",
    });
    const response = await PATCH(request, mockParams(UUID));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual(updatedField);
  });

  it("returns 400 for invalid UUID", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const request = createTestRequest("PATCH", "/api/crm/fields/not-a-uuid", {
      label: "Updated",
    });
    const response = await PATCH(request, mockParams("not-a-uuid"));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Invalid ID format");
  });

  it("returns 404 when field not found", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    setResult("field_definitions", { data: null, error: { message: "Not found" } });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    const request = createTestRequest("PATCH", `/api/crm/fields/${UUID}`, {
      label: "Updated",
    });
    const response = await PATCH(request, mockParams(UUID));
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Field not found");
  });
});

// ── DELETE /api/crm/fields/[id] ─────────────────────────────────────────────

describe("DELETE /api/crm/fields/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requirePermission).mockReturnValue(null);
  });

  it("deletes field successfully", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    setResult("field_definitions", { data: null, error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    const request = createTestRequest("DELETE", `/api/crm/fields/${UUID}`);
    const response = await DELETE(request, mockParams(UUID));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it("returns 400 for invalid UUID", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const request = createTestRequest("DELETE", "/api/crm/fields/bad-id");
    const response = await DELETE(request, mockParams("bad-id"));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Invalid ID format");
  });
});
