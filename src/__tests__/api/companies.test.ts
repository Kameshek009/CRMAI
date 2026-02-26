import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/crm/companies/route";
import { GET as GET_BY_ID, PATCH, DELETE } from "@/app/api/crm/companies/[id]/route";
import { createMockSupabase } from "@/__tests__/helpers/mock-supabase";
import { mockTeamContext, mockAuthError, createTestRequest, mockParams } from "@/__tests__/helpers/mock-context";

vi.mock("@/lib/supabase/server", () => ({ createSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/crm/team-helpers", () => ({ getTeamContext: vi.fn(), requirePermission: vi.fn() }));
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
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);
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
      vi.mocked(getTeamContext).mockResolvedValue(mockAuthError() as any);

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
      const newCompany = {
        id: "company-1",
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
        entityId: "company-1",
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
      const company = {
        id: "company-1",
        name: "Test Company",
        team_id: "ws-test-456",
        is_deleted: false,
      };
      setResult("companies", { data: company });
      setResult("contacts", { count: 5 });
      setResult("deals", { count: 3 });

      const req = createTestRequest("GET", "/api/crm/companies/company-1");
      const res = await GET_BY_ID(req, mockParams("company-1"));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.id).toBe("company-1");
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
      const oldRecord = {
        id: "company-1",
        name: "Old Name",
        team_id: "ws-test-456",
      };
      const updatedCompany = {
        id: "company-1",
        name: "Updated Name",
        team_id: "ws-test-456",
      };

      setResult("companies", { data: oldRecord });
      const mock = createMockSupabase();
      supabase = mock.supabase;
      setResult = mock.setResult;
      vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);

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

      const req = createTestRequest("PATCH", "/api/crm/companies/company-1", { name: "Updated Name" });
      const res = await PATCH(req, mockParams("company-1"));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.name).toBe("Updated Name");
      expect(logAudit).toHaveBeenCalledWith({
        teamId: "ws-test-456",
        accountId: "acc-test-123",
        entityType: "company",
        entityId: "company-1",
        action: "update",
        changes: {},
      });
    });
  });

  describe("DELETE /api/crm/companies/[id]", () => {
    it("soft-deletes company", async () => {
      setResult("companies", { data: { name: "Company to Delete" } });
      setResult("crm_activities", { data: {} });

      const req = createTestRequest("DELETE", "/api/crm/companies/company-1");
      const res = await DELETE(req, mockParams("company-1"));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
    });

    it("calls logAudit", async () => {
      setResult("companies", { data: { name: "Company to Delete" } });
      setResult("crm_activities", { data: {} });

      const req = createTestRequest("DELETE", "/api/crm/companies/company-1");
      await DELETE(req, mockParams("company-1"));

      expect(logAudit).toHaveBeenCalledWith({
        teamId: "ws-test-456",
        accountId: "acc-test-123",
        entityType: "company",
        entityId: "company-1",
        action: "delete",
      });
    });
  });
});
