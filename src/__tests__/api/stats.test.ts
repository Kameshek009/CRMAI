import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all dependencies BEFORE importing the route
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: vi.fn(),
}));
vi.mock("@/lib/crm/team-helpers", () => {
  const getTeamContext = vi.fn();
  return { getTeamContext, getWorkspaceContext: getTeamContext, requirePermission: vi.fn() };
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

import { GET as GET_STATS } from "@/app/api/crm/stats/route";
import { GET as GET_ANALYTICS } from "@/app/api/crm/stats/analytics/route";
import { GET as GET_FORECAST } from "@/app/api/crm/stats/forecast/route";
import { GET as GET_REVENUE_TREND } from "@/app/api/crm/stats/revenue-trend/route";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { createMockSupabase } from "../helpers/mock-supabase";
import {
  mockTeamContext,
  mockNoPermContext,
  mockAuthError,
  createTestRequest,
} from "../helpers/mock-context";

// ── GET /api/crm/stats ─────────────────────────────────────────────────────

describe("GET /api/crm/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requirePermission).mockReturnValue(null);
  });

  it("returns dashboard stats with all counters", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult, setRpcResult } = createMockSupabase();
    // contacts total (count query)
    setResult("contacts", { data: null, error: null, count: 150 });
    // contacts this week (count query)
    setResult("contacts", { data: null, error: null, count: 12 });
    // deals total (count query)
    setResult("deals", { data: null, error: null, count: 45 });
    // tasks due today (count query)
    setResult("crm_tasks", { data: null, error: null, count: 5 });
    // overdue tasks (count query)
    setResult("crm_tasks", { data: null, error: null, count: 3 });

    // RPC results
    setRpcResult("get_deal_stats", {
      data: [{ open_count: 20, pipeline_value: 500000, weighted_forecast: 250000 }],
      error: null,
    });
    setRpcResult("get_won_deals_stats", {
      data: [{ won_count: 8, won_value: 120000 }],
      error: null,
    });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    const request = createTestRequest("GET", "/api/crm/stats");
    const response = await GET_STATS(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveProperty("totalContacts");
    expect(json.data).toHaveProperty("totalDeals");
    expect(json.data).toHaveProperty("pipelineValue");
    expect(json.data).toHaveProperty("tasksDueToday");
    expect(json.data).toHaveProperty("overdueTasksCount");
    expect(json.data).toHaveProperty("wonDealsThisMonth");
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockAuthError());

    const request = createTestRequest("GET", "/api/crm/stats");
    const response = await GET_STATS(request);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.success).toBe(false);
  });

  it("returns 403 when no analytics permission", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockNoPermContext());
    const { NextResponse } = await import("next/server");
    vi.mocked(requirePermission).mockReturnValue(
      NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    );

    const request = createTestRequest("GET", "/api/crm/stats");
    const response = await GET_STATS(request);
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.success).toBe(false);
  });
});

// ── GET /api/crm/stats/analytics ────────────────────────────────────────────

describe("GET /api/crm/stats/analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requirePermission).mockReturnValue(null);
  });

  it("returns analytics data with deal metrics", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();

    // deals query
    setResult("deals", {
      data: [
        {
          id: "d-1", value: 50000, status: "won", stage_id: "s-1",
          ai_win_probability: 90, created_at: "2025-01-01",
          actual_close_date: "2025-01-15", expected_close_date: "2025-01-20",
          deal_stages: { name: "Closed Won", color: "green", position: 5, is_won: true, is_lost: false },
        },
        {
          id: "d-2", value: 30000, status: "open", stage_id: "s-2",
          ai_win_probability: 60, created_at: "2025-02-01",
          actual_close_date: null, expected_close_date: "2025-03-01",
          deal_stages: { name: "Negotiation", color: "blue", position: 3, is_won: false, is_lost: false },
        },
      ],
      error: null,
    });

    // stages query
    setResult("deal_stages", {
      data: [
        { id: "s-1", name: "Closed Won", color: "green", position: 5, is_won: true, is_lost: false },
        { id: "s-2", name: "Negotiation", color: "blue", position: 3, is_won: false, is_lost: false },
      ],
      error: null,
    });

    // contacts query
    setResult("contacts", {
      data: [
        { id: "c-1", status: "active", source: "website", engagement_score: 80, created_at: "2025-01-01" },
        { id: "c-2", status: "lead", source: "referral", engagement_score: 60, created_at: "2025-01-05" },
      ],
      error: null,
    });

    // activities query
    setResult("activities", { data: [], error: null });

    // tasks query
    setResult("crm_tasks", {
      data: [
        { id: "t-1", status: "done", priority: "high", type: "call", due_date: "2025-01-10", completed_at: "2025-01-10", created_at: "2025-01-01" },
      ],
      error: null,
    });

    // companies query
    setResult("companies", {
      data: [
        { id: "comp-1", ai_health_score: 85, industry: "Tech" },
      ],
      error: null,
    });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    const request = createTestRequest("GET", "/api/crm/stats/analytics");
    const response = await GET_ANALYTICS(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveProperty("stageConversion");
    expect(json.data).toHaveProperty("winRate");
    expect(json.data).toHaveProperty("monthlyRevenue");
    expect(json.data).toHaveProperty("contactsByStatus");
    expect(json.data).toHaveProperty("healthBuckets");
    expect(json.data).toHaveProperty("totalContacts");
    expect(json.data).toHaveProperty("totalCompanies");
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockAuthError());

    const request = createTestRequest("GET", "/api/crm/stats/analytics");
    const response = await GET_ANALYTICS(request);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.success).toBe(false);
  });

  it("handles empty data gracefully", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    setResult("deals", { data: [], error: null });
    setResult("deal_stages", { data: [], error: null });
    setResult("contacts", { data: [], error: null });
    setResult("activities", { data: [], error: null });
    setResult("crm_tasks", { data: [], error: null });
    setResult("companies", { data: [], error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    const request = createTestRequest("GET", "/api/crm/stats/analytics");
    const response = await GET_ANALYTICS(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.winRate).toBe(0);
    expect(json.data.avgDaysToClose).toBe(0);
    expect(json.data.totalContacts).toBe(0);
    expect(json.data.totalCompanies).toBe(0);
  });
});

// ── GET /api/crm/stats/forecast ─────────────────────────────────────────────

describe("GET /api/crm/stats/forecast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requirePermission).mockReturnValue(null);
  });

  it("returns forecast data with scenarios", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    setResult("deals", {
      data: [
        {
          id: "d-1", value: 100000, status: "open", stage_id: "s-1",
          ai_win_probability: 70, created_at: "2025-01-01",
          actual_close_date: null, expected_close_date: "2025-04-01",
          deal_stages: { id: "s-1", name: "Negotiation", color: "blue", position: 3, is_won: false, is_lost: false },
        },
        {
          id: "d-2", value: 50000, status: "won", stage_id: "s-2",
          ai_win_probability: 100, created_at: "2024-11-01",
          actual_close_date: "2025-01-15", expected_close_date: "2025-01-30",
          deal_stages: { id: "s-2", name: "Closed Won", color: "green", position: 5, is_won: true, is_lost: false },
        },
      ],
      error: null,
    });
    setResult("deal_stages", {
      data: [
        { id: "s-1", name: "Negotiation", color: "blue", position: 3, is_won: false, is_lost: false },
        { id: "s-2", name: "Closed Won", color: "green", position: 5, is_won: true, is_lost: false },
      ],
      error: null,
    });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    const request = createTestRequest("GET", "/api/crm/stats/forecast");
    const response = await GET_FORECAST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveProperty("stageBreakdown");
    expect(json.data).toHaveProperty("weightedPipeline");
    expect(json.data).toHaveProperty("winRate");
    expect(json.data).toHaveProperty("avgCycleTime");
    expect(json.data).toHaveProperty("scenarios");
    expect(json.data.scenarios).toHaveLength(3); // 30, 60, 90 days
    expect(json.data).toHaveProperty("monthlyHistory");
    expect(json.data).toHaveProperty("openDealsCount");
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockAuthError());

    const request = createTestRequest("GET", "/api/crm/stats/forecast");
    const response = await GET_FORECAST(request);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.success).toBe(false);
  });

  it("handles empty deals gracefully", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    setResult("deals", { data: [], error: null });
    setResult("deal_stages", { data: [], error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    const request = createTestRequest("GET", "/api/crm/stats/forecast");
    const response = await GET_FORECAST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.winRate).toBe(0);
    expect(json.data.openDealsCount).toBe(0);
    expect(json.data.weightedPipeline).toBe(0);
  });
});

// ── GET /api/crm/stats/revenue-trend ────────────────────────────────────────

describe("GET /api/crm/stats/revenue-trend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requirePermission).mockReturnValue(null);
  });

  it("returns 30-day revenue trend with cumulative data", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    const today = new Date().toISOString().split("T")[0];
    setResult("deals", {
      data: [
        { value: 10000, actual_close_date: today },
        { value: 25000, actual_close_date: today },
      ],
      error: null,
    });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    const request = createTestRequest("GET", "/api/crm/stats/revenue-trend");
    const response = await GET_REVENUE_TREND(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(30);
    // Each entry should have date, revenue, and cumulative
    expect(json.data[0]).toHaveProperty("date");
    expect(json.data[0]).toHaveProperty("revenue");
    expect(json.data[0]).toHaveProperty("cumulative");
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockAuthError());

    const request = createTestRequest("GET", "/api/crm/stats/revenue-trend");
    const response = await GET_REVENUE_TREND(request);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.success).toBe(false);
  });

  it("returns zeroed trend when no deals", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    setResult("deals", { data: [], error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    const request = createTestRequest("GET", "/api/crm/stats/revenue-trend");
    const response = await GET_REVENUE_TREND(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(30);
    // All entries should have zero revenue when no deals
    const totalRevenue = json.data.reduce((sum: number, d: { revenue: number }) => sum + d.revenue, 0);
    expect(totalRevenue).toBe(0);
  });
});
