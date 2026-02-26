import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all dependencies BEFORE importing the route
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: vi.fn(),
}));
vi.mock("@/lib/crm/team-helpers", () => {
  const getTeamContext = vi.fn();
  return { getTeamContext, getWorkspaceContext: getTeamContext, requirePermission: vi.fn() };
});
vi.mock("@/lib/crm/validation", () => ({
  bulkContactsSchema: {
    safeParse: (data: unknown) => {
      const d = data as Record<string, unknown>;
      if (!d.action || !d.ids || !Array.isArray(d.ids) || d.ids.length === 0) {
        return { success: false, error: { issues: [{ message: "Invalid bulk input" }] } };
      }
      return { success: true, data: d };
    },
  },
  bulkCompaniesSchema: {
    safeParse: (data: unknown) => {
      const d = data as Record<string, unknown>;
      if (!d.action || !d.ids || !Array.isArray(d.ids) || d.ids.length === 0) {
        return { success: false, error: { issues: [{ message: "Invalid bulk input" }] } };
      }
      return { success: true, data: d };
    },
  },
  bulkDealsSchema: {
    safeParse: (data: unknown) => {
      const d = data as Record<string, unknown>;
      if (!d.action || !d.ids || !Array.isArray(d.ids) || d.ids.length === 0) {
        return { success: false, error: { issues: [{ message: "Invalid bulk input" }] } };
      }
      return { success: true, data: d };
    },
  },
  bulkTasksSchema: {
    safeParse: (data: unknown) => {
      const d = data as Record<string, unknown>;
      if (!d.action || !d.ids || !Array.isArray(d.ids) || d.ids.length === 0) {
        return { success: false, error: { issues: [{ message: "Invalid bulk input" }] } };
      }
      return { success: true, data: d };
    },
  },
}));
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

import { POST as BULK_CONTACTS } from "@/app/api/crm/contacts/bulk/route";
import { POST as BULK_COMPANIES } from "@/app/api/crm/companies/bulk/route";
import { POST as BULK_DEALS } from "@/app/api/crm/deals/bulk/route";
import { POST as BULK_TASKS } from "@/app/api/crm/tasks/bulk/route";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { createMockSupabase } from "../helpers/mock-supabase";
import {
  mockTeamContext,
  mockAuthError,
  createTestRequest,
} from "../helpers/mock-context";

// ── POST /api/crm/contacts/bulk ─────────────────────────────────────────────

describe("POST /api/crm/contacts/bulk", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requirePermission).mockReturnValue(null);
  });

  it("bulk deletes contacts successfully", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    setResult("contacts", { data: null, error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    const request = createTestRequest("POST", "/api/crm/contacts/bulk", {
      action: "delete",
      ids: ["id-1", "id-2", "id-3"],
    });
    const response = await BULK_CONTACTS(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.deleted).toBe(3);
  });

  it("bulk updates contact status", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    setResult("contacts", { data: null, error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    const request = createTestRequest("POST", "/api/crm/contacts/bulk", {
      action: "update_status",
      ids: ["id-1", "id-2"],
      status: "active",
    });
    const response = await BULK_CONTACTS(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.updated).toBe(2);
  });

  it("returns 400 for unknown action", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase } = createMockSupabase();
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    const request = createTestRequest("POST", "/api/crm/contacts/bulk", {
      action: "unknown_action",
      ids: ["id-1"],
    });
    const response = await BULK_CONTACTS(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockAuthError());

    const request = createTestRequest("POST", "/api/crm/contacts/bulk", {
      action: "delete",
      ids: ["id-1"],
    });
    const response = await BULK_CONTACTS(request);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.success).toBe(false);
  });
});

// ── POST /api/crm/companies/bulk ────────────────────────────────────────────

describe("POST /api/crm/companies/bulk", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requirePermission).mockReturnValue(null);
  });

  it("bulk deletes companies successfully", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    setResult("companies", { data: null, error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    const request = createTestRequest("POST", "/api/crm/companies/bulk", {
      action: "delete",
      ids: ["comp-1", "comp-2"],
    });
    const response = await BULK_COMPANIES(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.deleted).toBe(2);
  });

  it("returns 400 for unknown action", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase } = createMockSupabase();
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    const request = createTestRequest("POST", "/api/crm/companies/bulk", {
      action: "update_status",
      ids: ["comp-1"],
    });
    const response = await BULK_COMPANIES(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
  });
});

// ── POST /api/crm/deals/bulk ────────────────────────────────────────────────

describe("POST /api/crm/deals/bulk", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requirePermission).mockReturnValue(null);
  });

  it("bulk deletes deals successfully", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    setResult("deals", { data: null, error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    const request = createTestRequest("POST", "/api/crm/deals/bulk", {
      action: "delete",
      ids: ["deal-1", "deal-2"],
    });
    const response = await BULK_DEALS(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.deleted).toBe(2);
  });

  it("bulk updates deal status", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    setResult("deals", { data: null, error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    const request = createTestRequest("POST", "/api/crm/deals/bulk", {
      action: "update_status",
      ids: ["deal-1"],
      status: "won",
    });
    const response = await BULK_DEALS(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.updated).toBe(1);
  });

  it("returns 500 when DB fails on delete", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    setResult("deals", { data: null, error: { message: "DB error" } });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    const request = createTestRequest("POST", "/api/crm/deals/bulk", {
      action: "delete",
      ids: ["deal-1"],
    });
    const response = await BULK_DEALS(request);
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.success).toBe(false);
  });
});

// ── POST /api/crm/tasks/bulk ────────────────────────────────────────────────

describe("POST /api/crm/tasks/bulk", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requirePermission).mockReturnValue(null);
  });

  it("bulk deletes tasks successfully", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    setResult("crm_tasks", { data: null, error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    const request = createTestRequest("POST", "/api/crm/tasks/bulk", {
      action: "delete",
      ids: ["task-1", "task-2", "task-3"],
    });
    const response = await BULK_TASKS(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.deleted).toBe(3);
  });

  it("bulk updates task status", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    setResult("crm_tasks", { data: null, error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    const request = createTestRequest("POST", "/api/crm/tasks/bulk", {
      action: "update_status",
      ids: ["task-1", "task-2"],
      status: "done",
    });
    const response = await BULK_TASKS(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.updated).toBe(2);
  });

  it("returns 400 for unknown action", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase } = createMockSupabase();
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    const request = createTestRequest("POST", "/api/crm/tasks/bulk", {
      action: "archive",
      ids: ["task-1"],
    });
    const response = await BULK_TASKS(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
  });
});
