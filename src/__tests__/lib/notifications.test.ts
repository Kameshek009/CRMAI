import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase } from "../helpers/mock-supabase";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { createNotification, createTeamNotification } from "@/lib/crm/notifications";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: vi.fn(),
}));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe("createNotification", () => {
  let supabase: ReturnType<typeof createMockSupabase>["supabase"];
  let chain: ReturnType<typeof createMockSupabase>["chain"];
  let setResult: ReturnType<typeof createMockSupabase>["setResult"];

  beforeEach(() => {
    vi.clearAllMocks();
    const mock = createMockSupabase();
    supabase = mock.supabase;
    chain = mock.chain;
    setResult = mock.setResult;
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);
  });

  it("inserts notification with correct fields", async () => {
    setResult("accounts", { data: { notification_preferences: {} }, error: null });
    setResult("notifications", { data: null, error: null });

    await createNotification({
      accountId: "acc-1",
      teamId: "team-1",
      type: "deal_assigned",
      title: "New deal",
      message: "You got a deal",
      entityType: "deal",
      entityId: "deal-1",
    });

    expect(supabase.from).toHaveBeenCalledWith("notifications");
    expect(chain.insert).toHaveBeenCalledWith({
      account_id: "acc-1",
      team_id: "team-1",
      type: "deal_assigned",
      title: "New deal",
      message: "You got a deal",
      entity_type: "deal",
      entity_id: "deal-1",
    });
  });

  it("skips when prefs[prefKey] === false", async () => {
    setResult("accounts", {
      data: { notification_preferences: { deal_assigned: false } },
      error: null,
    });
    setResult("notifications", { data: null, error: null });

    await createNotification({
      accountId: "acc-1",
      teamId: "team-1",
      type: "deal_assigned",
      title: "New deal",
    });

    expect(chain.insert).not.toHaveBeenCalled();
  });

  it("sends when prefs[prefKey] is undefined (not explicitly false)", async () => {
    setResult("accounts", {
      data: { notification_preferences: { deal_assigned: undefined } },
      error: null,
    });
    setResult("notifications", { data: null, error: null });

    await createNotification({
      accountId: "acc-1",
      teamId: "team-1",
      type: "deal_assigned",
      title: "New deal",
    });

    expect(chain.insert).toHaveBeenCalled();
  });

  it("handles null notification_preferences (account has no prefs)", async () => {
    setResult("accounts", {
      data: { notification_preferences: null },
      error: null,
    });
    setResult("notifications", { data: null, error: null });

    await createNotification({
      accountId: "acc-1",
      teamId: "team-1",
      type: "deal_assigned",
      title: "New deal",
    });

    expect(chain.insert).toHaveBeenCalled();
  });

  it("handles unknown type (no prefKey mapping) and still sends", async () => {
    setResult("accounts", { data: { notification_preferences: {} }, error: null });
    setResult("notifications", { data: null, error: null });

    await createNotification({
      accountId: "acc-1",
      teamId: "team-1",
      type: "some_unknown_type",
      title: "Unknown",
    });

    expect(chain.insert).toHaveBeenCalled();
  });

  it("never throws on Supabase error — logs to logger.error", async () => {
    vi.mocked(createSupabaseAdmin).mockImplementation(() => {
      throw new Error("Supabase connection failed");
    });

    await expect(
      createNotification({
        accountId: "acc-1",
        teamId: "team-1",
        type: "deal_assigned",
        title: "New deal",
      })
    ).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledWith(
      "Notifications",
      "Failed to create notification",
      expect.any(Error)
    );
  });

  it("sets message/entity_type/entity_id to null when not provided", async () => {
    setResult("accounts", { data: { notification_preferences: {} }, error: null });
    setResult("notifications", { data: null, error: null });

    await createNotification({
      accountId: "acc-1",
      teamId: "team-1",
      type: "deal_assigned",
      title: "New deal",
    });

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        message: null,
        entity_type: null,
        entity_id: null,
      })
    );
  });
});

describe("createTeamNotification", () => {
  let supabase: ReturnType<typeof createMockSupabase>["supabase"];
  let chain: ReturnType<typeof createMockSupabase>["chain"];
  let setResult: ReturnType<typeof createMockSupabase>["setResult"];

  beforeEach(() => {
    vi.clearAllMocks();
    const mock = createMockSupabase();
    supabase = mock.supabase;
    chain = mock.chain;
    setResult = mock.setResult;
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);
  });

  it("fetches active members and creates notification for each", async () => {
    const members = [{ account_id: "acc-1" }, { account_id: "acc-2" }];

    // First call: createTeamNotification fetches team_members
    setResult("team_members", { data: members, error: null });

    // For each member, createNotification calls accounts + notifications
    // Member 1
    setResult("accounts", { data: { notification_preferences: {} }, error: null });
    setResult("notifications", { data: null, error: null });
    // Member 2
    setResult("accounts", { data: { notification_preferences: {} }, error: null });
    setResult("notifications", { data: null, error: null });

    await createTeamNotification({
      teamId: "team-1",
      type: "new_team_member",
      title: "Welcome!",
      message: "New member joined",
    });

    // createSupabaseAdmin called once for the team query + once per member
    expect(createSupabaseAdmin).toHaveBeenCalledTimes(3);
    expect(supabase.from).toHaveBeenCalledWith("team_members");
    expect(supabase.from).toHaveBeenCalledWith("accounts");
    expect(supabase.from).toHaveBeenCalledWith("notifications");
  });

  it("returns early when no members found", async () => {
    setResult("team_members", { data: [], error: null });

    await createTeamNotification({
      teamId: "team-1",
      type: "new_team_member",
      title: "Welcome!",
    });

    // Only the initial call for team_members, no createNotification calls
    expect(createSupabaseAdmin).toHaveBeenCalledTimes(1);
    expect(chain.insert).not.toHaveBeenCalled();
  });

  it("never throws on error — logs to logger.error", async () => {
    vi.mocked(createSupabaseAdmin).mockImplementation(() => {
      throw new Error("DB down");
    });

    await expect(
      createTeamNotification({
        teamId: "team-1",
        type: "new_team_member",
        title: "Welcome!",
      })
    ).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledWith(
      "Notifications",
      "Failed to create team notification",
      expect.any(Error)
    );
  });
});
