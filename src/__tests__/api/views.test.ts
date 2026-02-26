import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all dependencies BEFORE importing the route
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: vi.fn(),
}));
vi.mock("@/lib/crm/team-helpers", () => {
  const getTeamContext = vi.fn();
  return { getTeamContext, getWorkspaceContext: getTeamContext, requirePermission: vi.fn() };
});
vi.mock("@/lib/crm/helpers", () => ({
  isValidUUID: (id: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  },
}));
vi.mock("@/lib/crm/validation", () => ({
  createSavedViewSchema: {
    safeParse: (data: unknown) => {
      const d = data as Record<string, unknown>;
      if (!d.entity_type || !d.label) {
        return { success: false, error: { issues: [{ message: "Missing required fields" }] } };
      }
      return { success: true, data: d };
    },
  },
  updateSavedViewSchema: {
    safeParse: (data: unknown) => {
      return { success: true, data };
    },
  },
}));
vi.mock("@/types/crm", () => ({
  transformSavedViewRow: (row: Record<string, unknown>) => row,
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

import { GET, POST } from "@/app/api/crm/views/route";
import { GET as GET_BY_ID, PATCH, DELETE } from "@/app/api/crm/views/[id]/route";
import { PATCH as TOGGLE_PIN } from "@/app/api/crm/views/[id]/pin/route";
import { GET as GET_PINNED } from "@/app/api/crm/views/pinned/route";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext } from "@/lib/crm/team-helpers";
import { createMockSupabase } from "../helpers/mock-supabase";
import {
  mockTeamContext,
  mockAuthError,
  createTestRequest,
  mockParams,
} from "../helpers/mock-context";

// ── GET /api/crm/views ─────────────────────────────────────────────────────

describe("GET /api/crm/views", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns views list", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    const mockViews = [
      { id: "v-1", label: "Active Contacts", entity_type: "contacts", is_pinned: false },
      { id: "v-2", label: "Open Deals", entity_type: "deals", is_pinned: true },
    ];
    setResult("saved_views", { data: mockViews, error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);

    const request = createTestRequest("GET", "/api/crm/views");
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual(mockViews);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockAuthError());

    const request = createTestRequest("GET", "/api/crm/views");
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.success).toBe(false);
  });

  it("returns 500 when DB fails", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    setResult("saved_views", { data: null, error: { message: "DB error" } });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);

    const request = createTestRequest("GET", "/api/crm/views");
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.success).toBe(false);
  });
});

// ── POST /api/crm/views ────────────────────────────────────────────────────

describe("POST /api/crm/views", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates view with valid data", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    const newView = {
      id: "v-new",
      label: "My Custom View",
      entity_type: "contacts",
      team_id: "ws-test-456",
      created_by_account_id: "acc-test-123",
    };
    setResult("saved_views", { data: newView, error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);

    const request = createTestRequest("POST", "/api/crm/views", {
      entity_type: "contacts",
      label: "My Custom View",
    });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual(newView);
  });

  it("returns 400 on invalid input (missing label)", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const request = createTestRequest("POST", "/api/crm/views", {
      entity_type: "contacts",
    });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Invalid input");
  });
});

// ── PATCH /api/crm/views/[id] ──────────────────────────────────────────────

describe("PATCH /api/crm/views/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates view with valid data", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    const updatedView = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      label: "Updated View",
      entity_type: "contacts",
    };
    setResult("saved_views", { data: updatedView, error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);

    const request = createTestRequest("PATCH", "/api/crm/views/550e8400-e29b-41d4-a716-446655440000", {
      label: "Updated View",
    });
    const response = await PATCH(request, mockParams("550e8400-e29b-41d4-a716-446655440000"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual(updatedView);
  });

  it("returns 400 for invalid UUID", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const request = createTestRequest("PATCH", "/api/crm/views/not-a-uuid", {
      label: "Updated",
    });
    const response = await PATCH(request, mockParams("not-a-uuid"));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Invalid ID format");
  });

  it("returns 404 when view not found", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    setResult("saved_views", { data: null, error: { message: "Not found" } });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);

    const request = createTestRequest("PATCH", "/api/crm/views/550e8400-e29b-41d4-a716-446655440000", {
      label: "Updated",
    });
    const response = await PATCH(request, mockParams("550e8400-e29b-41d4-a716-446655440000"));
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.success).toBe(false);
  });
});

// ── DELETE /api/crm/views/[id] ─────────────────────────────────────────────

describe("DELETE /api/crm/views/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes view successfully", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    setResult("saved_views", { data: null, error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);

    const request = createTestRequest("DELETE", "/api/crm/views/550e8400-e29b-41d4-a716-446655440000");
    const response = await DELETE(request, mockParams("550e8400-e29b-41d4-a716-446655440000"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it("returns 400 for invalid UUID", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const request = createTestRequest("DELETE", "/api/crm/views/bad-id");
    const response = await DELETE(request, mockParams("bad-id"));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Invalid ID format");
  });
});

// ── PATCH /api/crm/views/[id]/pin (toggle pin) ─────────────────────────────

describe("PATCH /api/crm/views/[id]/pin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("toggles pin status from false to true", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    // First query: fetch current pin status
    setResult("saved_views", { data: { is_pinned: false }, error: null });
    // Second query: update returns the new data
    setResult("saved_views", {
      data: { id: "550e8400-e29b-41d4-a716-446655440000", is_pinned: true },
      error: null,
    });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);

    const request = createTestRequest("PATCH", "/api/crm/views/550e8400-e29b-41d4-a716-446655440000/pin");
    const response = await TOGGLE_PIN(request, mockParams("550e8400-e29b-41d4-a716-446655440000"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.is_pinned).toBe(true);
  });

  it("returns 404 when view not found", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    setResult("saved_views", { data: null, error: { message: "Not found" } });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);

    const request = createTestRequest("PATCH", "/api/crm/views/550e8400-e29b-41d4-a716-446655440000/pin");
    const response = await TOGGLE_PIN(request, mockParams("550e8400-e29b-41d4-a716-446655440000"));
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.success).toBe(false);
  });
});

// ── GET /api/crm/views/pinned ──────────────────────────────────────────────

describe("GET /api/crm/views/pinned", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns pinned views", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    const pinnedViews = [
      { id: "v-1", label: "Pinned View 1", is_pinned: true, entity_type: "contacts" },
      { id: "v-2", label: "Pinned View 2", is_pinned: true, entity_type: "deals" },
    ];
    setResult("saved_views", { data: pinnedViews, error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);

    const request = createTestRequest("GET", "/api/crm/views/pinned");
    const response = await GET_PINNED(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(2);
  });

  it("returns 500 when DB fails", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    setResult("saved_views", { data: null, error: { message: "DB error" } });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);

    const request = createTestRequest("GET", "/api/crm/views/pinned");
    const response = await GET_PINNED(request);
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.success).toBe(false);
  });
});
