import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { GET, POST } from "@/app/api/crm/companies/route";
import { GET as GET_BY_ID, PATCH, DELETE } from "@/app/api/crm/companies/[id]/route";
import { createMockSupabase } from "@/__tests__/helpers/mock-supabase";
import { mockTeamContext, mockAuthError, createTestRequest, mockParams } from "@/__tests__/helpers/mock-context";

vi.mock("@/lib/supabase/server", () => ({ createSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/crm/team-helpers", () => { const f = vi.fn(); return { getTeamContext: f, getWorkspaceContext: f, requirePermission: vi.fn() }; });
vi.mock("@/lib/crm/audit", () => ({ logAudit: vi.fn(), computeChanges: vi.fn() }));
vi.mock("@/lib/usage/feature-limits", () => ({ requireFeatureLimit: vi.fn() }));
vi.mock("@/lib/crm/query-builder", () => ({ parseListParams: vi.fn(), applyListQuery: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const { createSupabaseAdmin } = await import("@/lib/supabase/server");
const { getTeamContext, requirePermission } = await import("@/lib/crm/team-helpers");
const { logAudit, computeChanges } = await import("@/lib/crm/audit");
const { requireFeatureLimit } = await import("@/lib/usage/feature-limits");
const { parseListParams, applyListQuery } = await import("@/lib/crm/query-builder");

describe("Companies API", () => {
  let supabase: ReturnType<typeof createMockSupabase>["supabase"];
  let setResult: ReturnType<typeof createMockSupabase>["setResult"];

  beforeEach(() => {
    vi.clearAllMocks();
    const mock = createMockSupabase();
    supabase = mock.supabase;
    setResult = mock.setResult;

    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());
    vi.mocked(requirePermission).mockReturnValue(null);
    vi.mocked(requireFeatureLimit).mockResolvedValue(null);
    vi.mocked(parseListParams).mockReturnValue({});
    vi.mocked(applyListQuery).mockImplementation((query) => query);
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);
    vi.mocked(computeChanges).mockReturnValue({});
  });

  describe("GET /api/crm/companies", () => {
    it("returns companies list", async () => {
      const companies = [
        { id: "1", name: "Company A", team_id: "ws-test-456", is_deleted: false },
        { id: "2", name: "Company B", team_id: "ws-test-456", is_deleted: false },
      ];
      setResult("companies", { data: companies, count: 2 });

      const req = createTestRequest("GET", "/api/crm/companies");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toEqual(companies);
      expect(json.total).toBe(2);
    });

    it("returns 401 when not authenticated", async () => {
      vi.mocked(getTeamContext).mockResolvedValue(mockAuthError());

      const req = createTestRequest("GET", "/api/crm/companies");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error).toBe("Unauthorized");
    });
  });

  describe("POST /api/crm/companies", () => {
    it("creates company with valid data", async () => {
      const companyId = "00000000-0000-0000-0000-000000000001";
      const newCompany = {
        id: companyId,
        name: "New Company",
        team_id: "ws-test-456",
        account_id: "acc-test-123",
      };
      setResult("companies", { data: newCompany });
      setResult("crm_activities", { data: {} });

      const req = createTestRequest("POST", "/api/crm/companies", { name: "New Company" });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toEqual(newCompany);
      expect(logAudit).toHaveBeenCalledWith({
        teamId: "ws-test-456",
        accountId: "acc-test-123",
        entityType: "company",
        entityId: companyId,
        action: "create",
      });
    });

    it("returns 400 on invalid input (missing name)", async () => {
      const req = createTestRequest("POST", "/api/crm/companies", {});
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toBe("Invalid input");
    });
  });

  describe("GET /api/crm/companies/[id]", () => {
    it("returns company with contact_count and deal_count", async () => {
      const companyId = "00000000-0000-0000-0000-000000000001";
      const company = {
        id: companyId,
        name: "Test Company",
        team_id: "ws-test-456",
        is_deleted: false,
      };

      // Create a sophisticated mock to handle Promise.all with different tables
      const tableResponses: Record<string, any> = {
        companies: { data: company, error: null },
        contacts: { data: null, error: null, count: 5 },
        deals: { data: null, error: null, count: 3 },
      };

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        const response = tableResponses[table] || { data: null, error: null, count: 0 };
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: response.data, error: response.error }),
          then: (resolve: any) => Promise.resolve({ ...response }).then(resolve),
        };
      });

      const mockSupabase = { from: mockFrom };
      vi.mocked(createSupabaseAdmin).mockReturnValue(mockSupabase as unknown as SupabaseClient);

      const req = createTestRequest("GET", `/api/crm/companies/${companyId}`);
      const res = await GET_BY_ID(req, mockParams(companyId));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.id).toBe(companyId);
      expect(json.data.contact_count).toBe(5);
      expect(json.data.deal_count).toBe(3);
    });

    it("returns 400 for invalid UUID", async () => {
      const req = createTestRequest("GET", "/api/crm/companies/invalid-id");
      const res = await GET_BY_ID(req, mockParams("invalid-id"));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toBe("Invalid ID format");
    });

    it("returns 404 when not found", async () => {
      setResult("companies", { data: null, error: { message: "Not found" } });

      const req = createTestRequest("GET", "/api/crm/companies/00000000-0000-0000-0000-000000000000");
      const res = await GET_BY_ID(req, mockParams("00000000-0000-0000-0000-000000000000"));
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.error).toBe("Company not found");
    });
  });

  describe("PATCH /api/crm/companies/[id]", () => {
    it("updates company", async () => {
      const companyId = "00000000-0000-0000-0000-000000000001";
      const oldRecord = {
        id: companyId,
        name: "Old Name",
        team_id: "ws-test-456",
      };
      const updatedCompany = {
        id: companyId,
        name: "Updated Name",
        team_id: "ws-test-456",
      };

      setResult("companies", { data: oldRecord });
      const mock = createMockSupabase();
      supabase = mock.supabase;
      setResult = mock.setResult;
      vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

      // First call returns old record, second returns updated
      let callCount = 0;
      mock.chain.single.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ data: oldRecord });
        }
        return Promise.resolve({ data: updatedCompany });
      });

      setResult("crm_activities", { data: {} });

      const req = createTestRequest("PATCH", `/api/crm/companies/${companyId}`, { name: "Updated Name" });
      const res = await PATCH(req, mockParams(companyId));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.name).toBe("Updated Name");
      expect(logAudit).toHaveBeenCalledWith({
        teamId: "ws-test-456",
        accountId: "acc-test-123",
        entityType: "company",
        entityId: companyId,
        action: "update",
        changes: {},
      });
    });
  });

  describe("DELETE /api/crm/companies/[id]", () => {
    it("soft-deletes company", async () => {
      const companyId = "00000000-0000-0000-0000-000000000001";
      setResult("companies", { data: { name: "Company to Delete" } });
      setResult("crm_activities", { data: {} });

      const req = createTestRequest("DELETE", `/api/crm/companies/${companyId}`);
      const res = await DELETE(req, mockParams(companyId));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
    });

    it("calls logAudit", async () => {
      const companyId = "00000000-0000-0000-0000-000000000001";
      setResult("companies", { data: { name: "Company to Delete" } });
      setResult("crm_activities", { data: {} });

      const req = createTestRequest("DELETE", `/api/crm/companies/${companyId}`);
      await DELETE(req, mockParams(companyId));

      expect(logAudit).toHaveBeenCalledWith({
        teamId: "ws-test-456",
        accountId: "acc-test-123",
        entityType: "company",
        entityId: companyId,
        action: "delete",
      });
    });
  });
});
