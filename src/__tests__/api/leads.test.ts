import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all dependencies BEFORE importing the routes
vi.mock("@/lib/supabase/server", () => ({ createSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/crm/team-helpers", () => ({ getTeamContext: vi.fn(), requirePermission: vi.fn() }));
vi.mock("@/lib/crm/audit", () => ({ logAudit: vi.fn() }));
vi.mock("@/lib/crm/helpers", () => ({ isValidUUID: vi.fn(), ensureDealStages: vi.fn() }));
vi.mock("@/lib/crm/query-builder", () => ({ parseListParams: vi.fn(), applyListQuery: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { GET, POST } from "@/app/api/crm/leads/route";
import { GET as GET_BY_ID, PATCH, DELETE } from "@/app/api/crm/leads/[id]/route";
import { POST as POST_CONVERT } from "@/app/api/crm/leads/[id]/convert/route";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { logAudit } from "@/lib/crm/audit";
import { isValidUUID } from "@/lib/crm/helpers";
import { parseListParams, applyListQuery } from "@/lib/crm/query-builder";
import { createMockSupabase } from "../helpers/mock-supabase";
import { mockTeamContext, mockAuthError, createTestRequest, mockParams } from "../helpers/mock-context";

const TEST_UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("GET /api/crm/leads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requirePermission).mockReturnValue(null);
    vi.mocked(parseListParams).mockReturnValue({});
    vi.mocked(applyListQuery).mockImplementation((query) => query);
  });

  it("returns leads list with total count", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    const mockLeads = [
      { id: "1", first_name: "Alice", last_name: "Brown" },
      { id: "2", first_name: "Bob", last_name: "Green" },
    ];
    setResult("leads", { data: mockLeads, count: 2 });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);

    const request = createTestRequest("GET", "/api/crm/leads");
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual(mockLeads);
    expect(json.total).toBe(2);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockAuthError());

    const request = createTestRequest("GET", "/api/crm/leads");
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.success).toBe(false);
  });
});

describe("POST /api/crm/leads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requirePermission).mockReturnValue(null);
  });

  it("creates lead with valid data", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    const newLead = { id: "new-lead-1", first_name: "Alice", last_name: "Brown", email: "alice@example.com" };
    setResult("leads", { data: newLead, error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);

    const request = createTestRequest("POST", "/api/crm/leads", {
      first_name: "Alice",
      last_name: "Brown",
      email: "alice@example.com",
    });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual(newLead);
  });

  it("returns 400 on invalid input (missing first_name)", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const request = createTestRequest("POST", "/api/crm/leads", {
      email: "alice@example.com",
    });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Invalid input");
  });

  it("converts empty email to null", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult, chain } = createMockSupabase();
    const newLead = { id: "new-lead-2", first_name: "Bob", email: null };
    setResult("leads", { data: newLead, error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);

    const request = createTestRequest("POST", "/api/crm/leads", {
      first_name: "Bob",
      email: "",
    });
    await POST(request);

    // Verify that insert was called with email: null (not "")
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ email: null })
    );
  });

  it("calls logAudit on success", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    const newLead = { id: "new-lead-3", first_name: "Charlie" };
    setResult("leads", { data: newLead, error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);

    const request = createTestRequest("POST", "/api/crm/leads", {
      first_name: "Charlie",
    });
    await POST(request);

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "lead",
        entityId: "new-lead-3",
        action: "create",
      })
    );
  });
});

describe("GET /api/crm/leads/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requirePermission).mockReturnValue(null);
  });

  it("returns single lead", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());
    vi.mocked(isValidUUID).mockReturnValue(true);

    const { supabase, setResult } = createMockSupabase();
    const lead = { id: TEST_UUID, first_name: "Alice", last_name: "Brown" };
    setResult("leads", { data: lead, error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);

    const request = createTestRequest("GET", `/api/crm/leads/${TEST_UUID}`);
    const response = await GET_BY_ID(request, mockParams(TEST_UUID));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual(lead);
  });

  it("returns 400 for invalid UUID", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());
    vi.mocked(isValidUUID).mockReturnValue(false);

    const request = createTestRequest("GET", "/api/crm/leads/not-a-uuid");
    const response = await GET_BY_ID(request, mockParams("not-a-uuid"));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Invalid ID");
  });
});

describe("DELETE /api/crm/leads/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requirePermission).mockReturnValue(null);
  });

  it("soft-deletes lead", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());
    vi.mocked(isValidUUID).mockReturnValue(true);

    const { supabase, setResult } = createMockSupabase();
    setResult("leads", { data: null, error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);

    const request = createTestRequest("DELETE", `/api/crm/leads/${TEST_UUID}`);
    const response = await DELETE(request, mockParams(TEST_UUID));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "lead",
        entityId: TEST_UUID,
        action: "delete",
      })
    );
  });
});

describe("POST /api/crm/leads/[id]/convert", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requirePermission).mockReturnValue(null);
  });

  it("converts lead to contact (create_contact=true)", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());
    vi.mocked(isValidUUID).mockReturnValue(true);

    const { supabase, setResult } = createMockSupabase();
    const leadData = {
      id: TEST_UUID,
      first_name: "Alice",
      last_name: "Brown",
      email: "alice@example.com",
      phone: null,
      job_title: "Engineer",
      source: "website",
      tags: ["vip"],
    };
    // 1st call: fetch lead
    setResult("leads", { data: leadData });
    // 2nd call: create contact
    setResult("contacts", { data: { id: "new-contact-id" } });
    // 3rd call: update lead status (thenable)
    setResult("leads", { data: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);

    const request = createTestRequest("POST", `/api/crm/leads/${TEST_UUID}/convert`, {
      create_contact: true,
      create_deal: false,
    });
    const response = await POST_CONVERT(request, mockParams(TEST_UUID));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.contact_id).toBe("new-contact-id");
    expect(json.data.deal_id).toBeNull();
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "lead",
        entityId: TEST_UUID,
        action: "update",
        changes: expect.objectContaining({
          converted: { old: false, new: true },
          contact_id: { old: null, new: "new-contact-id" },
        }),
      })
    );
  });

  it("returns 404 when lead not found", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());
    vi.mocked(isValidUUID).mockReturnValue(true);

    const { supabase, setResult } = createMockSupabase();
    // Lead not found
    setResult("leads", { data: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);

    const request = createTestRequest("POST", `/api/crm/leads/${TEST_UUID}/convert`, {
      create_contact: true,
    });
    const response = await POST_CONVERT(request, mockParams(TEST_UUID));
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Lead not found");
  });

  it("returns 400 for invalid UUID", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());
    vi.mocked(isValidUUID).mockReturnValue(false);

    const request = createTestRequest("POST", "/api/crm/leads/bad-id/convert", {
      create_contact: true,
    });
    const response = await POST_CONVERT(request, mockParams("bad-id"));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Invalid ID");
  });
});
