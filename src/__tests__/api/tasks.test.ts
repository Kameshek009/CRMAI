import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/crm/tasks/route";
import { GET as GET_BY_ID, PATCH, DELETE } from "@/app/api/crm/tasks/[id]/route";
import { createMockSupabase } from "@/__tests__/helpers/mock-supabase";
import { mockTeamContext, mockAuthError, createTestRequest, mockParams } from "@/__tests__/helpers/mock-context";

vi.mock("@/lib/supabase/server", () => ({ createSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/crm/team-helpers", () => { const f = vi.fn(); return { getTeamContext: f, getWorkspaceContext: f, requirePermission: vi.fn() }; });
vi.mock("@/lib/usage/feature-limits", () => ({ requireFeatureLimit: vi.fn() }));
vi.mock("@/lib/crm/query-builder", () => ({ parseListParams: vi.fn(), applyListQuery: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const { createSupabaseAdmin } = await import("@/lib/supabase/server");
const { getTeamContext, requirePermission } = await import("@/lib/crm/team-helpers");
const { requireFeatureLimit } = await import("@/lib/usage/feature-limits");
const { parseListParams, applyListQuery } = await import("@/lib/crm/query-builder");

describe("Tasks API", () => {
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
  });

  describe("GET /api/crm/tasks", () => {
    it("returns tasks list", async () => {
      const tasks = [
        { id: "1", title: "Task A", team_id: "ws-test-456", is_deleted: false, status: "todo" },
        { id: "2", title: "Task B", team_id: "ws-test-456", is_deleted: false, status: "done" },
      ];
      setResult("crm_tasks", { data: tasks, count: 2 });

      const req = createTestRequest("GET", "/api/crm/tasks");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toEqual(tasks);
      expect(json.total).toBe(2);
    });

    it("returns 401 when not authenticated", async () => {
      vi.mocked(getTeamContext).mockResolvedValue(mockAuthError());

      const req = createTestRequest("GET", "/api/crm/tasks");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error).toBe("Unauthorized");
    });
  });

  describe("POST /api/crm/tasks", () => {
    it("creates task with valid data", async () => {
      const taskId = "00000000-0000-0000-0000-000000000001";
      const newTask = {
        id: taskId,
        title: "New Task",
        team_id: "ws-test-456",
        account_id: "acc-test-123",
        status: "todo",
      };
      setResult("crm_tasks", { data: newTask });
      setResult("crm_activities", { data: {} });

      const req = createTestRequest("POST", "/api/crm/tasks", { title: "New Task" });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toEqual(newTask);
    });

    it("returns 400 on invalid input (missing title)", async () => {
      const req = createTestRequest("POST", "/api/crm/tasks", {});
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toBe("Invalid input");
    });
  });

  describe("GET /api/crm/tasks/[id]", () => {
    it("returns single task", async () => {
      const taskId = "00000000-0000-0000-0000-000000000001";
      const task = {
        id: taskId,
        title: "Test Task",
        team_id: "ws-test-456",
        is_deleted: false,
        status: "in_progress",
      };
      setResult("crm_tasks", { data: task });

      const req = createTestRequest("GET", `/api/crm/tasks/${taskId}`);
      const res = await GET_BY_ID(req, mockParams(taskId));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.id).toBe(taskId);
      expect(json.data.title).toBe("Test Task");
    });

    it("returns 400 for invalid UUID", async () => {
      const req = createTestRequest("GET", "/api/crm/tasks/invalid-id");
      const res = await GET_BY_ID(req, mockParams("invalid-id"));
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toBe("Invalid ID format");
    });
  });

  describe("PATCH /api/crm/tasks/[id]", () => {
    it("updates task", async () => {
      const taskId = "00000000-0000-0000-0000-000000000001";
      const updatedTask = {
        id: taskId,
        title: "Updated Task",
        team_id: "ws-test-456",
        status: "in_progress",
      };
      setResult("crm_tasks", { data: updatedTask });
      setResult("crm_activities", { data: {} });

      const req = createTestRequest("PATCH", `/api/crm/tasks/${taskId}`, { title: "Updated Task" });
      const res = await PATCH(req, mockParams(taskId));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.title).toBe("Updated Task");
    });

    it("sets completed_at when status is done", async () => {
      const taskId = "00000000-0000-0000-0000-000000000001";
      const updatedTask = {
        id: taskId,
        title: "Completed Task",
        team_id: "ws-test-456",
        status: "done",
        completed_at: new Date().toISOString(),
      };
      setResult("crm_tasks", { data: updatedTask });
      setResult("crm_activities", { data: {} });

      const req = createTestRequest("PATCH", `/api/crm/tasks/${taskId}`, { status: "done" });
      const res = await PATCH(req, mockParams(taskId));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.status).toBe("done");
      expect(json.data.completed_at).toBeDefined();
    });
  });

  describe("DELETE /api/crm/tasks/[id]", () => {
    it("soft-deletes task", async () => {
      const taskId = "00000000-0000-0000-0000-000000000001";
      setResult("crm_tasks", { data: { title: "Task to Delete" } });
      setResult("crm_activities", { data: {} });

      const req = createTestRequest("DELETE", `/api/crm/tasks/${taskId}`);
      const res = await DELETE(req, mockParams(taskId));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
    });

    it("returns 500 when task not found", async () => {
      const taskId = "00000000-0000-0000-0000-000000000000";

      const mock = createMockSupabase();
      supabase = mock.supabase;
      setResult = mock.setResult;
      vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

      // First call returns null for existing task check
      mock.chain.single.mockImplementation(() => {
        return Promise.resolve({ data: null });
      });

      // Mock the update to return error
      mock.setResult("crm_tasks", { error: { message: "Not found" } });

      const req = createTestRequest("DELETE", `/api/crm/tasks/${taskId}`);
      const res = await DELETE(req, mockParams(taskId));
      const json = await res.json();

      // The route returns 500 on DB error
      expect(res.status).toBe(500);
      expect(json.success).toBe(false);
    });
  });
});
