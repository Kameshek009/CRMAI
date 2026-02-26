import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/crm/search/route";
import { createMockSupabase } from "@/__tests__/helpers/mock-supabase";
import { mockTeamContext, mockAuthError, createTestRequest } from "@/__tests__/helpers/mock-context";

vi.mock("@/lib/supabase/server", () => ({ createSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/crm/team-helpers", () => ({ getTeamContext: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const { createSupabaseAdmin } = await import("@/lib/supabase/server");
const { getTeamContext } = await import("@/lib/crm/team-helpers");

describe("Search API", () => {
  let supabase: ReturnType<typeof createMockSupabase>["supabase"];
  let setResult: ReturnType<typeof createMockSupabase>["setResult"];

  beforeEach(() => {
    vi.clearAllMocks();
    const mock = createMockSupabase();
    supabase = mock.supabase;
    setResult = mock.setResult;

    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);
  });

  describe("GET /api/crm/search", () => {
    it("returns results from multiple entity types", async () => {
      const contacts = [
        { id: "c1", first_name: "John", last_name: "Doe", email: "john@example.com", title: "CEO" },
      ];
      const companies = [
        { id: "co1", name: "Acme Corp", industry: "Tech", domain: "acme.com" },
      ];
      const deals = [
        { id: "d1", title: "Big Deal", value: 50000, status: "open" },
      ];
      const tasks = [
        { id: "t1", title: "Follow up call", status: "todo", priority: "high" },
      ];

      setResult("contacts", { data: contacts });
      setResult("companies", { data: companies });
      setResult("deals", { data: deals });
      setResult("crm_tasks", { data: tasks });

      const req = createTestRequest("GET", "/api/crm/search?q=test");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toHaveLength(4);

      const types = json.data.map((r: any) => r.type);
      expect(types).toContain("contact");
      expect(types).toContain("company");
      expect(types).toContain("deal");
      expect(types).toContain("task");

      const contact = json.data.find((r: any) => r.type === "contact");
      expect(contact.title).toBe("John Doe");
      expect(contact.subtitle).toBe("john@example.com");

      const company = json.data.find((r: any) => r.type === "company");
      expect(company.title).toBe("Acme Corp");
      expect(company.subtitle).toBe("Tech");

      const deal = json.data.find((r: any) => r.type === "deal");
      expect(deal.title).toBe("Big Deal");
      expect(deal.subtitle).toBe("$50,000 - open");

      const task = json.data.find((r: any) => r.type === "task");
      expect(task.title).toBe("Follow up call");
      expect(task.subtitle).toBe("high - todo");
    });

    it("returns 401 when not authenticated", async () => {
      vi.mocked(getTeamContext).mockResolvedValue(mockAuthError() as any);

      const req = createTestRequest("GET", "/api/crm/search?q=test");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error).toBe("Unauthorized");
    });

    it("returns 400 when q parameter is missing", async () => {
      const req = createTestRequest("GET", "/api/crm/search");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toBe("Query required");
    });

    it("returns 400 when q is too long (>100 chars)", async () => {
      const longQuery = "a".repeat(101);
      const req = createTestRequest("GET", `/api/crm/search?q=${longQuery}`);
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toBe("Query too long");
    });

    it("returns empty array when no results found", async () => {
      setResult("contacts", { data: [] });
      setResult("companies", { data: [] });
      setResult("deals", { data: [] });
      setResult("crm_tasks", { data: [] });

      const req = createTestRequest("GET", "/api/crm/search?q=nonexistent");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toEqual([]);
    });

    it("handles special characters in search query", async () => {
      setResult("contacts", { data: [] });
      setResult("companies", { data: [] });
      setResult("deals", { data: [] });
      setResult("crm_tasks", { data: [] });

      const specialQuery = "test%_query";
      const req = createTestRequest("GET", `/api/crm/search?q=${encodeURIComponent(specialQuery)}`);
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toEqual([]);
    });
  });
});
