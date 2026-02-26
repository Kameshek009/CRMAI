import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all dependencies BEFORE importing the route
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: vi.fn(),
}));
vi.mock("@/lib/crm/team-helpers", () => {
  const getTeamContext = vi.fn();
  return { getTeamContext, getWorkspaceContext: getTeamContext, requirePermission: vi.fn() };
});
vi.mock("@/lib/crm/audit", () => ({
  logAudit: vi.fn(),
  computeChanges: vi.fn(),
}));
vi.mock("@/lib/crm/automation-engine", () => ({
  runAutomations: vi.fn(),
}));
vi.mock("@/lib/usage/feature-limits", () => ({
  requireFeatureLimit: vi.fn(),
}));
vi.mock("@/lib/crm/query-builder", () => ({
  parseListParams: vi.fn(),
  applyListQuery: vi.fn(),
}));
vi.mock("@/lib/crm/helpers", () => ({
  isValidUUID: (id: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  },
  ensureDealStages: vi.fn(),
}));
vi.mock("@/lib/crm/notifications", () => ({
  createNotification: vi.fn(),
}));
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { GET, POST } from "@/app/api/crm/deals/route";
import { GET as GET_BY_ID, PATCH, DELETE } from "@/app/api/crm/deals/[id]/route";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { logAudit, computeChanges } from "@/lib/crm/audit";
import { runAutomations } from "@/lib/crm/automation-engine";
import { requireFeatureLimit } from "@/lib/usage/feature-limits";
import { parseListParams, applyListQuery } from "@/lib/crm/query-builder";
import { ensureDealStages } from "@/lib/crm/helpers";
import { createMockSupabase } from "../helpers/mock-supabase";
import {
  mockTeamContext,
  mockAuthError,
  createTestRequest,
  mockParams,
} from "../helpers/mock-context";

describe("GET /api/crm/deals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requirePermission).mockReturnValue(null);
    vi.mocked(parseListParams).mockReturnValue({});
    vi.mocked(applyListQuery).mockImplementation((query) => query);
    vi.mocked(ensureDealStages).mockResolvedValue(undefined);
  });

  it("returns deals list and calls ensureDealStages", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    const mockDeals = [
      {
        id: "deal-1",
        title: "Big Sale",
        value: 50000,
        deal_stages: { id: "stage-1", name: "Negotiation", color: "blue" },
      },
      {
        id: "deal-2",
        title: "Small Sale",
        value: 10000,
        deal_stages: { id: "stage-2", name: "Closed Won", color: "green" },
      },
    ];
    setResult("deals", { data: mockDeals, count: 2 });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    const request = createTestRequest("GET", "/api/crm/deals");
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual(mockDeals);
    expect(json.total).toBe(2);
    expect(ensureDealStages).toHaveBeenCalledWith("acc-test-123", "ws-test-456");
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockAuthError());

    const request = createTestRequest("GET", "/api/crm/deals");
    const response = await GET(request);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.success).toBe(false);
  });
});

describe("POST /api/crm/deals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requirePermission).mockReturnValue(null);
    vi.mocked(requireFeatureLimit).mockResolvedValue(null);
  });

  it("creates deal with valid data", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const stageId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
    const { supabase, setResult } = createMockSupabase();
    const newDeal = {
      id: "deal-new",
      title: "New Deal",
      value: 25000,
      stage_id: stageId,
      deal_stages: { id: stageId, name: "Prospecting", color: "yellow" },
    };
    setResult("deals", { data: newDeal, error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    const request = createTestRequest("POST", "/api/crm/deals", {
      title: "New Deal",
      value: 25000,
      stage_id: stageId,
    });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual(newDeal);
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "deal",
        action: "create",
      })
    );
    expect(runAutomations).toHaveBeenCalledWith(
      expect.objectContaining({
        triggerType: "record_created",
        entityType: "deal",
      })
    );
  });

  it("returns 400 when stage_id missing", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const request = createTestRequest("POST", "/api/crm/deals", {
      title: "Deal without stage",
      value: 10000,
    });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Invalid input");
  });

  it("returns 403 on feature limit", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());
    const { NextResponse } = await import("next/server");
    vi.mocked(requireFeatureLimit).mockResolvedValue(
      NextResponse.json({ success: false, error: "Feature limit exceeded" }, { status: 403 })
    );

    const request = createTestRequest("POST", "/api/crm/deals", {
      title: "Deal",
      stage_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.success).toBe(false);
  });
});

describe("GET /api/crm/deals/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requirePermission).mockReturnValue(null);
  });

  it("returns single deal", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    const deal = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      title: "Big Deal",
      value: 100000,
      deal_stages: { id: "stage-1", name: "Negotiation", color: "blue" },
    };
    setResult("deals", { data: deal, error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    const request = createTestRequest("GET", "/api/crm/deals/550e8400-e29b-41d4-a716-446655440000");
    const response = await GET_BY_ID(request, mockParams("550e8400-e29b-41d4-a716-446655440000"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual(deal);
  });

  it("returns 400 for invalid UUID", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const request = createTestRequest("GET", "/api/crm/deals/not-a-uuid");
    const response = await GET_BY_ID(request, mockParams("not-a-uuid"));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Invalid ID format");
  });

  it("returns 404 when not found", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    setResult("deals", { data: null, error: { message: "Not found" } });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    const request = createTestRequest("GET", "/api/crm/deals/550e8400-e29b-41d4-a716-446655440000");
    const response = await GET_BY_ID(request, mockParams("550e8400-e29b-41d4-a716-446655440000"));
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.success).toBe(false);
  });
});

describe("PATCH /api/crm/deals/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requirePermission).mockReturnValue(null);
    vi.mocked(computeChanges).mockReturnValue({ title: { old: "Old Title", new: "New Title" } });
  });

  it("updates deal", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    const updatedDeal = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      title: "Updated Deal",
      value: 50000,
      deal_stages: { id: "stage-1", name: "Negotiation", color: "blue" },
    };
    setResult("deals", { data: updatedDeal, error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    const request = createTestRequest("PATCH", "/api/crm/deals/550e8400-e29b-41d4-a716-446655440000", {
      title: "Updated Deal",
    });
    const response = await PATCH(request, mockParams("550e8400-e29b-41d4-a716-446655440000"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual(updatedDeal);
  });

  it("triggers deal_stage_changed automation when stage_id changes", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const oldStageId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
    const newStageId = "b1ffcd00-ad1c-4ef9-bb7e-7cc0ce491b22";
    vi.mocked(computeChanges).mockReturnValue({
      stage_id: { old: oldStageId, new: newStageId },
    });

    const { supabase, setResult } = createMockSupabase();
    const updatedDeal = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      title: "Deal",
      stage_id: newStageId,
      deal_stages: { id: newStageId, name: "Closed Won", color: "green" },
    };

    // First call returns oldRecord, second returns updatedDeal
    setResult("deals", { data: updatedDeal, error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    const request = createTestRequest("PATCH", "/api/crm/deals/550e8400-e29b-41d4-a716-446655440000", {
      stage_id: newStageId,
    });
    await PATCH(request, mockParams("550e8400-e29b-41d4-a716-446655440000"));

    expect(runAutomations).toHaveBeenCalledWith(
      expect.objectContaining({
        triggerType: "deal_stage_changed",
        entityType: "deal",
      })
    );
  });
});

describe("DELETE /api/crm/deals/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requirePermission).mockReturnValue(null);
  });

  it("soft-deletes deal", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    setResult("deals", { data: null, error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    const request = createTestRequest("DELETE", "/api/crm/deals/550e8400-e29b-41d4-a716-446655440000");
    const response = await DELETE(request, mockParams("550e8400-e29b-41d4-a716-446655440000"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "deal",
        action: "delete",
      })
    );
  });

  it("returns 404 when not found", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    setResult("deals", { data: null, error: { message: "Not found" } });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    const request = createTestRequest("DELETE", "/api/crm/deals/550e8400-e29b-41d4-a716-446655440000");
    const response = await DELETE(request, mockParams("550e8400-e29b-41d4-a716-446655440000"));

    expect(response.status).toBe(500);
  });
});
