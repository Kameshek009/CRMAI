import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all dependencies BEFORE importing the route
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

import { GET, POST } from "@/app/api/crm/automations/route";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeamContext, requirePermission } from "@/lib/crm/team-helpers";
import { requireFeatureLimit } from "@/lib/usage/feature-limits";
import { createMockSupabase } from "../helpers/mock-supabase";
import {
  mockTeamContext,
  mockAuthError,
  createTestRequest,
} from "../helpers/mock-context";

const validAutomationBody = {
  name: "Auto-assign new leads",
  trigger_type: "record_created",
  trigger_config: {
    entity_type: "lead",
  },
  actions: [
    {
      type: "assign_to",
      config: { user_id: "user-123" },
    },
  ],
};

describe("GET /api/crm/automations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns automations list", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    const mockAutomations = [
      { id: "auto-1", name: "Auto-assign leads", trigger_type: "record_created" },
      { id: "auto-2", name: "Update deal stage", trigger_type: "field_changed" },
    ];
    setResult("automations", { data: mockAutomations });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual(mockAutomations);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockAuthError());

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.success).toBe(false);
  });
});

describe("POST /api/crm/automations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requirePermission).mockReturnValue(null);
    vi.mocked(requireFeatureLimit).mockResolvedValue(null);
  });

  it("creates automation with valid data", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult } = createMockSupabase();
    const newAutomation = {
      id: "auto-new-1",
      ...validAutomationBody,
      team_id: "ws-test-456",
      created_by: "acc-test-123",
    };
    setResult("automations", { data: newAutomation, error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);

    const request = createTestRequest("POST", "/api/crm/automations", validAutomationBody);
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual(newAutomation);
  });

  it("returns 403 when no permission", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());
    const { NextResponse } = await import("next/server");
    vi.mocked(requirePermission).mockReturnValue(
      NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    );

    const request = createTestRequest("POST", "/api/crm/automations", validAutomationBody);
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.success).toBe(false);
  });

  it("returns 403 when feature limit exceeded", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());
    const { NextResponse } = await import("next/server");
    vi.mocked(requireFeatureLimit).mockResolvedValue(
      NextResponse.json({ success: false, error: "Feature limit exceeded" }, { status: 403 })
    );

    const request = createTestRequest("POST", "/api/crm/automations", validAutomationBody);
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(403);
    expect(json.success).toBe(false);
  });

  it("returns 400 when trigger_type is invalid", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const request = createTestRequest("POST", "/api/crm/automations", {
      ...validAutomationBody,
      trigger_type: "invalid_trigger",
    });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Invalid input");
  });

  it("returns 400 when actions array is empty", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const request = createTestRequest("POST", "/api/crm/automations", {
      ...validAutomationBody,
      actions: [],
    });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Invalid input");
  });

  it("returns 400 when name is missing", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { name, ...bodyWithoutName } = validAutomationBody;
    const request = createTestRequest("POST", "/api/crm/automations", bodyWithoutName);
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Invalid input");
  });

  it("creates automation with conditions field", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const bodyWithConditions = {
      ...validAutomationBody,
      conditions: [
        { field: "status", operator: "eq", value: "active" },
      ],
    };

    const { supabase, setResult } = createMockSupabase();
    const newAutomation = {
      id: "auto-new-2",
      ...bodyWithConditions,
      team_id: "ws-test-456",
      created_by: "acc-test-123",
    };
    setResult("automations", { data: newAutomation, error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);

    const request = createTestRequest("POST", "/api/crm/automations", bodyWithConditions);
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual(newAutomation);
    expect(json.data.conditions).toEqual([
      { field: "status", operator: "eq", value: "active" },
    ]);
  });

  it("verifies team_id and created_by are set correctly", async () => {
    vi.mocked(getTeamContext).mockResolvedValue(mockTeamContext());

    const { supabase, setResult, chain } = createMockSupabase();
    const newAutomation = {
      id: "auto-new-3",
      ...validAutomationBody,
      team_id: "ws-test-456",
      created_by: "acc-test-123",
    };
    setResult("automations", { data: newAutomation, error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);

    const request = createTestRequest("POST", "/api/crm/automations", validAutomationBody);
    await POST(request);

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        team_id: "ws-test-456",
        created_by: "acc-test-123",
      })
    );
  });
});
