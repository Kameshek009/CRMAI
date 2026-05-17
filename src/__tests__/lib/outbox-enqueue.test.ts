import { describe, it, expect, vi, beforeEach } from "vitest";
import { enqueueOutboxEvent, enqueueOrLog } from "@/lib/outbox/enqueue";
import { logger } from "@/lib/logger";

type SupabaseLike = ReturnType<typeof makeSupabase>;

function makeSupabase(opts: {
  insertResult?: { data?: { id: string } | null; error?: { message: string } | null };
  throwOnInsert?: Error;
}) {
  const single = vi.fn().mockResolvedValue(
    opts.insertResult ?? { data: { id: "evt-1" }, error: null },
  );
  const select = vi.fn().mockReturnValue({ single });
  const insert = opts.throwOnInsert
    ? vi.fn().mockImplementation(() => {
        throw opts.throwOnInsert;
      })
    : vi.fn().mockReturnValue({ select });
  const from = vi.fn().mockReturnValue({ insert });
  return { from, _insert: insert, _select: select, _single: single };
}

const baseInput = {
  teamId: "team-1",
  eventType: "contact.created",
  entityType: "contact",
  entityId: "c-1",
  payload: { hello: "world" },
};

describe("enqueueOutboxEvent", () => {
  it("returns the inserted row id on success", async () => {
    const supa = makeSupabase({ insertResult: { data: { id: "evt-42" }, error: null } });
    const res = await enqueueOutboxEvent(supa as unknown as SupabaseLike & object as never, baseInput);
    expect(res).toEqual({ id: "evt-42" });
    expect(supa.from).toHaveBeenCalledWith("outbox_events");
    expect(supa._insert).toHaveBeenCalledWith({
      team_id: baseInput.teamId,
      event_type: baseInput.eventType,
      entity_type: baseInput.entityType,
      entity_id: baseInput.entityId,
      payload: baseInput.payload,
    });
  });

  it("returns {error} on supabase failure", async () => {
    const supa = makeSupabase({ insertResult: { data: null, error: { message: "boom" } } });
    const res = await enqueueOutboxEvent(supa as unknown as never, baseInput);
    expect(res).toEqual({ error: "boom" });
  });

  it("returns {error: insert_failed} when error is missing but data is null", async () => {
    const supa = makeSupabase({ insertResult: { data: null, error: null } });
    const res = await enqueueOutboxEvent(supa as unknown as never, baseInput);
    expect(res).toEqual({ error: "insert_failed" });
  });

  it("defaults entityId and payload when not provided", async () => {
    const supa = makeSupabase({});
    await enqueueOutboxEvent(supa as unknown as never, {
      teamId: "t",
      eventType: "x.y",
      entityType: "x",
    });
    expect(supa._insert).toHaveBeenCalledWith({
      team_id: "t",
      event_type: "x.y",
      entity_type: "x",
      entity_id: null,
      payload: {},
    });
  });
});

describe("enqueueOrLog", () => {
  beforeEach(() => {
    vi.spyOn(logger, "error").mockImplementation(() => {});
  });

  it("is silent on success", async () => {
    const supa = makeSupabase({});
    await enqueueOrLog(supa as unknown as never, baseInput);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("logs but does not throw on supabase failure", async () => {
    const supa = makeSupabase({ insertResult: { data: null, error: { message: "rls denied" } } });
    await expect(enqueueOrLog(supa as unknown as never, baseInput)).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(
      "Outbox",
      expect.stringContaining(baseInput.eventType),
      "rls denied",
    );
  });

  it("logs but does not throw if the supabase call itself throws", async () => {
    const supa = makeSupabase({ throwOnInsert: new Error("network down") });
    await expect(enqueueOrLog(supa as unknown as never, baseInput)).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalled();
  });
});
