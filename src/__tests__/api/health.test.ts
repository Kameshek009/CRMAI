import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies BEFORE importing the route
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: vi.fn(),
}));

import { GET } from "@/app/api/health/route";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { createMockSupabase } from "../helpers/mock-supabase";

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with healthy status when database check succeeds", async () => {
    const { supabase, setResult } = createMockSupabase();
    setResult("accounts", { data: [{ id: "test-id" }], error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.status).toBe("healthy");
    expect(json.checks.database.status).toBe("healthy");
  });

  it("returns 503 with degraded status when database returns error", async () => {
    const { supabase, setResult } = createMockSupabase();
    setResult("accounts", { data: null, error: { message: "DB connection failed" } });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(503);
    expect(json.status).toBe("degraded");
    expect(json.checks.database.status).toBe("degraded");
  });

  it("includes timestamp, checks, and latencyMs in response", async () => {
    const { supabase, setResult } = createMockSupabase();
    setResult("accounts", { data: [{ id: "test-id" }], error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);

    const response = await GET();
    const json = await response.json();

    expect(json).toHaveProperty("timestamp");
    expect(json).toHaveProperty("checks");
    expect(json).toHaveProperty("latencyMs");
    expect(typeof json.latencyMs).toBe("number");
  });

  it("includes status and latencyMs in database check", async () => {
    const { supabase, setResult } = createMockSupabase();
    setResult("accounts", { data: [{ id: "test-id" }], error: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase as any);

    const response = await GET();
    const json = await response.json();

    expect(json.checks.database).toHaveProperty("status");
    expect(json.checks.database).toHaveProperty("latencyMs");
    expect(typeof json.checks.database.latencyMs).toBe("number");
  });
});
