import { describe, it, expect } from "vitest";
import { createMockSupabase } from "../helpers/mock-supabase";
import { findBlockingOwnedTeams } from "@/lib/gdpr/sole-owner";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("findBlockingOwnedTeams", () => {
  it("returns empty array when the user owns no teams", async () => {
    const { supabase, setResult } = createMockSupabase();
    setResult("teams", { data: [], error: null });

    const result = await findBlockingOwnedTeams(supabase as unknown as SupabaseClient, "acc-1");
    expect(result).toEqual([]);
  });

  it("returns empty when owned teams have no other active members", async () => {
    const { supabase, setResult } = createMockSupabase();
    setResult("teams", { data: [{ id: "team-1", name: "Solo" }], error: null });
    setResult("team_members", { count: 0, error: null });

    const result = await findBlockingOwnedTeams(supabase as unknown as SupabaseClient, "acc-1");
    expect(result).toEqual([]);
  });

  it("flags teams with at least one other active member", async () => {
    const { supabase, setResult } = createMockSupabase();
    setResult("teams", {
      data: [
        { id: "team-1", name: "Shared" },
        { id: "team-2", name: "Solo" },
      ],
      error: null,
    });
    // Two team_members queries — Shared has 3, Solo has 0
    setResult("team_members", { count: 3, error: null });
    setResult("team_members", { count: 0, error: null });

    const result = await findBlockingOwnedTeams(supabase as unknown as SupabaseClient, "acc-1");
    expect(result).toEqual([
      { team_id: "team-1", team_name: "Shared", other_active_members: 3 },
    ]);
  });

  it("propagates DB errors from the teams query", async () => {
    const { supabase, setResult } = createMockSupabase();
    setResult("teams", { error: { message: "boom" } });
    await expect(
      findBlockingOwnedTeams(supabase as unknown as SupabaseClient, "acc-1"),
    ).rejects.toBeTruthy();
  });
});
