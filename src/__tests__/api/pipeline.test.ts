import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all dependencies BEFORE importing the route
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: vi.fn(),
}));
vi.mock("@/lib/crm/team-helpers", () => ({
  getTeamContext: vi.fn(),
  requirePermission: vi.fn(),
}));
vi.mock("@/lib/crm/helpers", () => ({
  ensureDealStages: vi.fn(),
}));
vi.mock("@/lib/crm/validation", () => ({
  createPipelineStageSchema: { safeParse: vi.fn() },
  reorderStagesSchema: { safeParse: vi.fn() },
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

import { GET, POST, PATCH } from "@/app/api/crm/pipeline/route";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { requireFeatureLimit } from "@/lib/usage/feature-limits";
import { createPipelineStageSchema, reorderStagesSchema } from "@/lib/crm/validation";
import { createMockSupabase } from "../helpers/mock-supabase";
import {
  mockTeamContext,
  mockNoPermContext,
  mockAuthError,
  createTestRequest,
} from "../helpers/mock-context";

// --- Helpers ---

function pipelineContext(overrides?: Record<string, unknown>) {
  return mockTeamContext({
    permissions: {
      contacts: { read: true, create: true, update: true, delete: true },
      companies: { read: true, create: true, update: true, delete: true },
      deals: { read: true, create: true, update: true, delete: true },
      tasks: { read: true, create: true, update: true, delete: true },
      notes: { read: true, create: true, update: true, delete: true },
      activities: { read: true },
      team_settings: { manage: true },
      analytics: { read: true },
      pipeline: { read: true, manage: true },
    },
    ...overrides,
  });
}

// --- GET /api/crm/pipeline ---

describe("GET /api/crm/pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requirePermission).mockReturnValue(null);
  });

  it("returns pipeline with stages and deals", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(pipelineContext());

    const { supabase, setResult } = createMockSupabase();

    const stages = [
      { id: "s1", position: 1, is_won: false, is_lost: false, rotting_days: null },
      { id: "s2", position: 2, is_won: true, is_lost: false, rotting_days: null },
    ];
    const deals = [
      { id: "d1", stage_id: "s1", status: "open", value: 1000, ai_win_probability: 50, updated_at: new Date().toISOString(), is_deleted: false },
      { id: "d2", stage_id: "s1", status: "open", value: 2000, ai_win_probability: 80, updated_at: new Date().toISOString(), is_deleted: false },
    ];

    setResult("deal_stages", { data: stages });
    setResult("deals", { data: deals });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.columns).toHaveLength(2);
    expect(json.data.columns[0].deals).toHaveLength(2);
    expect(json.data.columns[1].deals).toHaveLength(0);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockAuthError());

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.success).toBe(false);
  });

  it("returns 403 when no permission", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockNoPermContext());
    const { NextResponse } = await import("next/server");
    vi.mocked(requirePermission).mockReturnValue(
      NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    );

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.success).toBe(false);
  });

  it("calculates totalValue correctly", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(pipelineContext());

    const { supabase, setResult } = createMockSupabase();

    const stages = [
      { id: "s1", position: 1, is_won: false, is_lost: false, rotting_days: null },
    ];
    const deals = [
      { id: "d1", stage_id: "s1", status: "open", value: 500, ai_win_probability: 50, updated_at: new Date().toISOString() },
      { id: "d2", stage_id: "s1", status: "open", value: 1500, ai_win_probability: 80, updated_at: new Date().toISOString() },
    ];

    setResult("deal_stages", { data: stages });
    setResult("deals", { data: deals });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);

    const response = await GET();
    const json = await response.json();

    expect(json.data.totalValue).toBe(2000);
  });

  it("calculates weightedForecast correctly", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(pipelineContext());

    const { supabase, setResult } = createMockSupabase();

    const stages = [
      { id: "s1", position: 1, is_won: false, is_lost: false, rotting_days: null },
    ];
    // deal1: 1000 * 50/100 = 500, deal2: 2000 * 75/100 = 1500 => total = 2000
    const deals = [
      { id: "d1", stage_id: "s1", status: "open", value: 1000, ai_win_probability: 50, updated_at: new Date().toISOString() },
      { id: "d2", stage_id: "s1", status: "open", value: 2000, ai_win_probability: 75, updated_at: new Date().toISOString() },
    ];

    setResult("deal_stages", { data: stages });
    setResult("deals", { data: deals });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);

    const response = await GET();
    const json = await response.json();

    // 1000*0.5 + 2000*0.75 = 500 + 1500 = 2000
    expect(json.data.weightedForecast).toBe(2000);
  });
});

// --- POST /api/crm/pipeline ---

describe("POST /api/crm/pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requirePermission).mockReturnValue(null);
    vi.mocked(requireFeatureLimit).mockResolvedValue(null);
  });

  it("creates stage with valid data", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(pipelineContext());

    vi.mocked(createPipelineStageSchema.safeParse).mockReturnValue({
      success: true,
      data: { name: "New Stage", position: 1 },
    } as any);

    const { supabase, setResult } = createMockSupabase();
    const newStage = { id: "s-new", name: "New Stage", position: 1 };
    setResult("deal_stages", { data: newStage, error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);

    const request = createTestRequest("POST", "/api/crm/pipeline", {
      name: "New Stage",
      position: 1,
    });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual(newStage);
  });

  it("returns 400 on invalid input", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(pipelineContext());

    vi.mocked(createPipelineStageSchema.safeParse).mockReturnValue({
      success: false,
      error: { issues: [{ message: "Required" }] },
    } as any);

    const request = createTestRequest("POST", "/api/crm/pipeline", {});
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Invalid input");
  });

  it("returns 403 on feature limit exceeded", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(pipelineContext());
    const { NextResponse } = await import("next/server");
    vi.mocked(requireFeatureLimit).mockResolvedValue(
      NextResponse.json({ success: false, error: "Feature limit exceeded" }, { status: 403 })
    );

    const request = createTestRequest("POST", "/api/crm/pipeline", {
      name: "Stage",
      position: 1,
    });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.success).toBe(false);
  });
});

// --- PATCH /api/crm/pipeline ---

describe("PATCH /api/crm/pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requirePermission).mockReturnValue(null);
  });

  it("reorders stages with valid data", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(pipelineContext());

    const reorderData = {
      stages: [
        { id: "s1", position: 2 },
        { id: "s2", position: 1 },
      ],
    };

    vi.mocked(reorderStagesSchema.safeParse).mockReturnValue({
      success: true,
      data: reorderData,
    } as any);

    const { supabase, setResult } = createMockSupabase();
    // Each update call resolves via the deal_stages queue
    setResult("deal_stages", { data: null, error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);

    const request = createTestRequest("PATCH", "/api/crm/pipeline", reorderData);
    const response = await PATCH(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it("returns 400 on invalid input", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(pipelineContext());

    vi.mocked(reorderStagesSchema.safeParse).mockReturnValue({
      success: false,
      error: { issues: [{ message: "Required" }] },
    } as any);

    const request = createTestRequest("PATCH", "/api/crm/pipeline", {});
    const response = await PATCH(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Invalid input");
  });
});
