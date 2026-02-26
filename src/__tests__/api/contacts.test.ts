import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all dependencies BEFORE importing the route
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: vi.fn(),
}));
vi.mock("@/lib/crm/team-helpers", () => {
  const getTeamContext = vi.fn();
  return { getTeamContext, getWorkspaceContext: getTeamContext, requirePermission: vi.fn() };
});
vi.mock("@/lib/crm/audit", () => ({
  logAudit: vi.fn(),
  computeChanges: vi.fn(),
}));
vi.mock("@/lib/crm/automation-engine", () => ({
  runAutomations: vi.fn(),
}));
vi.mock("@/lib/usage/feature-limits", () => ({
  requireFeatureLimit: vi.fn(),
}));
vi.mock("@/lib/crm/query-builder", () => ({
  parseListParams: vi.fn(),
  applyListQuery: vi.fn(),
}));
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { GET, POST } from "@/app/api/crm/contacts/route";
import { GET as GET_BY_ID, PATCH, DELETE } from "@/app/api/crm/contacts/[id]/route";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { logAudit, computeChanges } from "@/lib/crm/audit";
import { runAutomations } from "@/lib/crm/automation-engine";
import { requireFeatureLimit } from "@/lib/usage/feature-limits";
import { parseListParams, applyListQuery } from "@/lib/crm/query-builder";
import { createMockSupabase } from "../helpers/mock-supabase";
import {
  mockTeamContext,
  mockNoPermContext,
  mockAuthError,
  createTestRequest,
  mockParams,
} from "../helpers/mock-context";

describe("GET /api/crm/contacts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requirePermission).mockReturnValue(null);
    vi.mocked(parseListParams).mockReturnValue({});
    vi.mocked(applyListQuery).mockImplementation((query) => query);
  });

  it("returns contacts list with total count", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    const mockContacts = [
      { id: "1", first_name: "John", last_name: "Doe" },
      { id: "2", first_name: "Jane", last_name: "Smith" },
    ];
    setResult("contacts", { data: mockContacts, count: 2 });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);

    const request = createTestRequest("GET", "/api/crm/contacts");
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual(mockContacts);
    expect(json.total).toBe(2);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockAuthError());

    const request = createTestRequest("GET", "/api/crm/contacts");
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.success).toBe(false);
  });

  it("returns 403 when no read permission", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockNoPermContext());
    const { NextResponse } = await import("next/server");
    vi.mocked(requirePermission).mockReturnValue(
      NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    );

    const request = createTestRequest("GET", "/api/crm/contacts");
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.success).toBe(false);
  });
});

describe("POST /api/crm/contacts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requirePermission).mockReturnValue(null);
    vi.mocked(requireFeatureLimit).mockResolvedValue(null);
  });

  it("creates contact with valid data", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    const newContact = {
      id: "new-1",
      first_name: "John",
      last_name: "Doe",
      email: "john@example.com",
    };
    setResult("contacts", { data: newContact, error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);

    const request = createTestRequest("POST", "/api/crm/contacts", {
      first_name: "John",
      last_name: "Doe",
      email: "john@example.com",
    });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual(newContact);
  });

  it("returns 400 on invalid input (missing first_name)", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const request = createTestRequest("POST", "/api/crm/contacts", {
      email: "john@example.com",
    });
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

    const request = createTestRequest("POST", "/api/crm/contacts", {
      first_name: "John",
    });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.success).toBe(false);
  });

  it("calls logAudit and runAutomations on success", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    const newContact = { id: "new-1", first_name: "John", last_name: "Doe" };
    setResult("contacts", { data: newContact, error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);

    const request = createTestRequest("POST", "/api/crm/contacts", {
      first_name: "John",
      last_name: "Doe",
    });
    await POST(request);

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "contact",
        action: "create",
      })
    );
    expect(runAutomations).toHaveBeenCalledWith(
      expect.objectContaining({
        triggerType: "record_created",
        entityType: "contact",
      })
    );
  });
});

describe("GET /api/crm/contacts/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requirePermission).mockReturnValue(null);
  });

  it("returns single contact", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    const contact = { id: "550e8400-e29b-41d4-a716-446655440000", first_name: "John", last_name: "Doe" };
    setResult("contacts", { data: contact, error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);

    const request = createTestRequest("GET", "/api/crm/contacts/550e8400-e29b-41d4-a716-446655440000");
    const response = await GET_BY_ID(request, mockParams("550e8400-e29b-41d4-a716-446655440000"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual(contact);
  });

  it("returns 400 for invalid UUID", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const request = createTestRequest("GET", "/api/crm/contacts/not-a-uuid");
    const response = await GET_BY_ID(request, mockParams("not-a-uuid"));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Invalid ID format");
  });

  it("returns 404 when not found", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    setResult("contacts", { data: null, error: { message: "Not found" } });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);

    const request = createTestRequest("GET", "/api/crm/contacts/550e8400-e29b-41d4-a716-446655440000");
    const response = await GET_BY_ID(request, mockParams("550e8400-e29b-41d4-a716-446655440000"));
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.success).toBe(false);
  });
});

describe("PATCH /api/crm/contacts/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requirePermission).mockReturnValue(null);
    vi.mocked(computeChanges).mockReturnValue({ first_name: { old: "John", new: "Jane" } });
  });

  it("updates contact with valid data", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    const updatedContact = { id: "550e8400-e29b-41d4-a716-446655440000", first_name: "Jane", last_name: "Doe" };
    setResult("contacts", { data: updatedContact, error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);

    const request = createTestRequest("PATCH", "/api/crm/contacts/550e8400-e29b-41d4-a716-446655440000", {
      first_name: "Jane",
    });
    const response = await PATCH(request, mockParams("550e8400-e29b-41d4-a716-446655440000"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual(updatedContact);
  });

  it("returns 400 on invalid input", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const request = createTestRequest("PATCH", "/api/crm/contacts/550e8400-e29b-41d4-a716-446655440000", {
      email: "not-an-email",
    });
    const response = await PATCH(request, mockParams("550e8400-e29b-41d4-a716-446655440000"));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
  });

  it("calls logAudit with computeChanges on success", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    const updatedContact = { id: "550e8400-e29b-41d4-a716-446655440000", first_name: "Jane" };
    setResult("contacts", { data: updatedContact, error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);

    const request = createTestRequest("PATCH", "/api/crm/contacts/550e8400-e29b-41d4-a716-446655440000", {
      first_name: "Jane",
    });
    await PATCH(request, mockParams("550e8400-e29b-41d4-a716-446655440000"));

    expect(computeChanges).toHaveBeenCalled();
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "contact",
        action: "update",
        changes: expect.any(Object),
      })
    );
  });
});

describe("DELETE /api/crm/contacts/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requirePermission).mockReturnValue(null);
  });

  it("soft-deletes contact successfully", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    setResult("contacts", { data: null, error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);

    const request = createTestRequest("DELETE", "/api/crm/contacts/550e8400-e29b-41d4-a716-446655440000");
    const response = await DELETE(request, mockParams("550e8400-e29b-41d4-a716-446655440000"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it("calls logAudit on success", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    setResult("contacts", { data: null, error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);

    const request = createTestRequest("DELETE", "/api/crm/contacts/550e8400-e29b-41d4-a716-446655440000");
    await DELETE(request, mockParams("550e8400-e29b-41d4-a716-446655440000"));

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "contact",
        action: "delete",
      })
    );
  });
});
