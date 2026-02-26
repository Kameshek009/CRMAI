import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/crm/notes/route";
import { NextResponse } from "next/server";
import { createMockSupabase } from "@/__tests__/helpers/mock-supabase";
import { createTestRequest, mockTeamContext, mockAuthError, mockNoPermContext } from "@/__tests__/helpers/mock-context";

// Mock Supabase
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: vi.fn(),
}));

// Mock team helpers
vi.mock("@/lib/crm/team-helpers", () => ({
  getTeamContext: vi.fn(),
  requirePermission: vi.fn(),
}));

import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";

describe("GET /api/crm/notes", () => {
  let supabase: ReturnType<typeof createMockSupabase>["supabase"];
  let setResult: ReturnType<typeof createMockSupabase>["setResult"];

  beforeEach(() => {
    vi.clearAllMocks();
    const mock = createMockSupabase();
    supabase = mock.supabase;
    setResult = mock.setResult;
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);
  });

  it("returns notes list", async () => {
    const ctx = mockTeamContext();
    vi.mocked(getTeamContext).mockResolvedValue(ctx as any);
    vi.mocked(requirePermission).mockReturnValue(null);

    const mockNotes = [
      { id: "note-1", content: "Test note 1", contact_id: "contact-1", is_deleted: false },
      { id: "note-2", content: "Test note 2", contact_id: "contact-2", is_deleted: false },
    ];

    setResult("crm_notes", { data: mockNotes, error: null, count: 2 });

    const req = createTestRequest("GET", "/api/crm/notes?limit=10&offset=0");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(2);
    expect(json.total).toBe(2);
  });

  it("filters by contact_id when provided", async () => {
    const ctx = mockTeamContext();
    vi.mocked(getTeamContext).mockResolvedValue(ctx as any);
    vi.mocked(requirePermission).mockReturnValue(null);

    const mockNotes = [
      { id: "note-1", content: "Test note 1", contact_id: "contact-123", is_deleted: false },
    ];

    setResult("crm_notes", { data: mockNotes, error: null, count: 1 });

    const req = createTestRequest("GET", "/api/crm/notes?contact_id=contact-123");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].contact_id).toBe("contact-123");
  });

  it("returns 401 when not authenticated", async () => {
    const authErr = mockAuthError();
    vi.mocked(getTeamContext).mockResolvedValue(authErr as any);

    const req = createTestRequest("GET", "/api/crm/notes");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
  });
});

describe("POST /api/crm/notes", () => {
  let supabase: ReturnType<typeof createMockSupabase>["supabase"];
  let setResult: ReturnType<typeof createMockSupabase>["setResult"];

  beforeEach(() => {
    vi.clearAllMocks();
    const mock = createMockSupabase();
    supabase = mock.supabase;
    setResult = mock.setResult;
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);
  });

  it("creates note with valid data", async () => {
    const ctx = mockTeamContext();
    vi.mocked(getTeamContext).mockResolvedValue(ctx as any);
    vi.mocked(requirePermission).mockReturnValue(null);

    const newNote = {
      id: "note-new-123",
      content: "New note content",
      contact_id: "contact-123",
      account_id: "acc-test-123",
      team_id: "ws-test-456",
      is_deleted: false,
    };

    setResult("crm_notes", { data: newNote, error: null });

    // Mock activity insert (does not fail the request if it fails)
    setResult("crm_activities", { data: null, error: null });

    const req = createTestRequest("POST", "/api/crm/notes", {
      content: "New note content",
      contact_id: "contact-123",
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.id).toBe("note-new-123");
    expect(json.data.content).toBe("New note content");
  });

  it("returns 400 on invalid input (missing content)", async () => {
    const ctx = mockTeamContext();
    vi.mocked(getTeamContext).mockResolvedValue(ctx as any);
    vi.mocked(requirePermission).mockReturnValue(null);

    const req = createTestRequest("POST", "/api/crm/notes", {
      contact_id: "contact-123",
      // Missing content
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toContain("Invalid input");
  });

  it("returns 403 when no permission", async () => {
    const ctx = mockNoPermContext();
    vi.mocked(getTeamContext).mockResolvedValue(ctx as any);
    vi.mocked(requirePermission).mockReturnValue(
      NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    );

    const req = createTestRequest("POST", "/api/crm/notes", {
      content: "New note content",
      contact_id: "contact-123",
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.success).toBe(false);
  });
});
