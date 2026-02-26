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

import { GET, POST } from "@/app/api/crm/sequences/route";
import {
  GET as GET_BY_ID,
  PATCH,
  DELETE,
} from "@/app/api/crm/sequences/[id]/route";
import { GET as GET_STEPS, POST as POST_STEP } from "@/app/api/crm/sequences/[id]/steps/route";
import { POST as POST_ENROLL } from "@/app/api/crm/sequences/[id]/enroll/route";
import { GET as GET_ENROLLMENTS } from "@/app/api/crm/sequences/[id]/enrollments/route";
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
const UUID2 = "660e8400-e29b-41d4-a716-446655440001";

// ── GET /api/crm/sequences ──────────────────────────────────────────────────

describe("GET /api/crm/sequences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns sequences list with enriched counts", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    const mockSequences = [
      {
        id: "seq-1",
        name: "Welcome series",
        email_sequence_steps: [{ id: "s1" }, { id: "s2" }],
        email_sequence_enrollments: [
          { id: "e1", status: "active" },
          { id: "e2", status: "completed" },
        ],
      },
    ];
    setResult("email_sequences", { data: mockSequences });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    const request = createTestRequest("GET", "/api/crm/sequences");
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data[0].step_count).toBe(2);
    expect(json.data[0].active_enrollments).toBe(1);
    expect(json.data[0].total_enrollments).toBe(2);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockAuthError());

    const request = createTestRequest("GET", "/api/crm/sequences");
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.success).toBe(false);
  });
});

// ── GET /api/crm/sequences/[id] ────────────────────────────────────────────

describe("GET /api/crm/sequences/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns single sequence with steps", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    const sequence = {
      id: UUID,
      name: "Welcome series",
      email_sequence_steps: [{ id: "s1", subject: "Welcome!" }],
    };
    setResult("email_sequences", { data: sequence, error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    const request = createTestRequest("GET", `/api/crm/sequences/${UUID}`);
    const response = await GET_BY_ID(request, mockParams(UUID));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.name).toBe("Welcome series");
  });

  it("returns 404 when sequence not found", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    setResult("email_sequences", { data: null, error: { message: "Not found" } });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    const request = createTestRequest("GET", `/api/crm/sequences/${UUID}`);
    const response = await GET_BY_ID(request, mockParams(UUID));
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Sequence not found");
  });
});

// ── POST /api/crm/sequences ────────────────────────────────────────────────

describe("POST /api/crm/sequences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requirePermission).mockReturnValue(null);
    vi.mocked(requireFeatureLimit).mockResolvedValue(null);
  });

  it("creates sequence with valid data", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    const newSequence = { id: "seq-new", name: "Onboarding", trigger_type: "manual" };
    setResult("email_sequences", { data: newSequence, error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    const request = createTestRequest("POST", "/api/crm/sequences", {
      name: "Onboarding",
      trigger_type: "manual",
    });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual(newSequence);
  });

  it("returns 400 when name is missing", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const request = createTestRequest("POST", "/api/crm/sequences", {
      trigger_type: "manual",
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

    const request = createTestRequest("POST", "/api/crm/sequences", {
      name: "Onboarding",
    });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.success).toBe(false);
  });
});

// ── PATCH /api/crm/sequences/[id] ──────────────────────────────────────────

describe("PATCH /api/crm/sequences/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requirePermission).mockReturnValue(null);
  });

  it("updates sequence with valid data", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    const updated = { id: UUID, name: "Updated name", is_active: true };
    setResult("email_sequences", { data: updated, error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    const request = createTestRequest("PATCH", `/api/crm/sequences/${UUID}`, {
      name: "Updated name",
      is_active: true,
    });
    const response = await PATCH(request, mockParams(UUID));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual(updated);
  });
});

// ── DELETE /api/crm/sequences/[id] ─────────────────────────────────────────

describe("DELETE /api/crm/sequences/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requirePermission).mockReturnValue(null);
  });

  it("deletes sequence successfully", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    setResult("email_sequences", { data: null, error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    const request = createTestRequest("DELETE", `/api/crm/sequences/${UUID}`);
    const response = await DELETE(request, mockParams(UUID));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
  });
});

// ── GET /api/crm/sequences/[id]/steps ──────────────────────────────────────

describe("GET /api/crm/sequences/[id]/steps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns steps for a sequence", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    const mockSteps = [
      { id: "s1", position: 0, delay_days: 0, subject: "Welcome!" },
      { id: "s2", position: 1, delay_days: 3, subject: "Follow up" },
    ];
    setResult("email_sequence_steps", { data: mockSteps });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    const request = createTestRequest("GET", `/api/crm/sequences/${UUID}/steps`);
    const response = await GET_STEPS(request, mockParams(UUID));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual(mockSteps);
    expect(json.data).toHaveLength(2);
  });
});

// ── POST /api/crm/sequences/[id]/steps ─────────────────────────────────────

describe("POST /api/crm/sequences/[id]/steps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requirePermission).mockReturnValue(null);
  });

  it("adds a step to a sequence", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult, chain } = createMockSupabase();
    const newStep = { id: "s-new", sequence_id: UUID, position: 0, delay_days: 1, subject: "Hi!", body: "Body text" };
    setResult("email_sequence_steps", { data: newStep, error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    const request = createTestRequest("POST", `/api/crm/sequences/${UUID}/steps`, {
      position: 0,
      delay_days: 1,
      subject: "Hi!",
      body: "Body text",
    });
    const response = await POST_STEP(request, mockParams(UUID));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual(newStep);

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        sequence_id: UUID,
        position: 0,
        delay_days: 1,
      })
    );
  });
});

// ── POST /api/crm/sequences/[id]/enroll ────────────────────────────────────

describe("POST /api/crm/sequences/[id]/enroll", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requirePermission).mockReturnValue(null);
  });

  it("enrolls contacts into a sequence", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    // First query: get first step
    setResult("email_sequence_steps", { data: [{ id: "s1", delay_days: 1, position: 0 }] });
    // Second query: count contacts
    setResult("contacts", { data: null, count: 2 });
    // Third query: insert enrollments
    const enrollmentData = [
      { id: "enr-1", sequence_id: UUID, contact_id: UUID },
      { id: "enr-2", sequence_id: UUID, contact_id: UUID2 },
    ];
    setResult("email_sequence_enrollments", { data: enrollmentData, error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    const request = createTestRequest("POST", `/api/crm/sequences/${UUID}/enroll`, {
      contact_ids: [UUID, UUID2],
    });
    const response = await POST_ENROLL(request, mockParams(UUID));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.enrolled).toBe(2);
  });

  it("returns 400 when sequence has no steps", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    setResult("email_sequence_steps", { data: [] });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    const request = createTestRequest("POST", `/api/crm/sequences/${UUID}/enroll`, {
      contact_ids: [UUID],
    });
    const response = await POST_ENROLL(request, mockParams(UUID));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Sequence has no steps");
  });
});

// ── GET /api/crm/sequences/[id]/enrollments ────────────────────────────────

describe("GET /api/crm/sequences/[id]/enrollments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns enrollments for a sequence", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    const mockEnrollments = [
      { id: "e1", status: "active", contacts: { id: UUID, first_name: "John", last_name: "Doe", email: "john@test.com" } },
      { id: "e2", status: "completed", contacts: { id: UUID2, first_name: "Jane", last_name: "Smith", email: "jane@test.com" } },
    ];
    setResult("email_sequence_enrollments", { data: mockEnrollments });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    const request = createTestRequest("GET", `/api/crm/sequences/${UUID}/enrollments`);
    const response = await GET_ENROLLMENTS(request, mockParams(UUID));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual(mockEnrollments);
    expect(json.data).toHaveLength(2);
  });
});
