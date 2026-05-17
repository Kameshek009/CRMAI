import { describe, it, expect, vi, beforeEach } from "vitest";

const verify = vi.fn();
vi.mock("svix", () => ({
  Webhook: class {
    verify(...args: unknown[]) {
      return verify(...args);
    }
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseAdmin: vi.fn(),
}));

const enqueueOrLog = vi.fn();
vi.mock("@/lib/outbox/enqueue", () => ({
  enqueueOrLog: (...args: unknown[]) => enqueueOrLog(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { POST } from "@/app/api/webhooks/resend/route";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { createMockSupabase } from "../helpers/mock-supabase";

function makeReq(body: object, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/webhooks/resend", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      "svix-id": "msg_1",
      "svix-timestamp": "1700000000",
      "svix-signature": "v1,sig",
      ...headers,
    },
  });
}

describe("POST /api/webhooks/resend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_WEBHOOK_SECRET = "whsec_test";
  });

  it("returns 500 when RESEND_WEBHOOK_SECRET is not configured", async () => {
    delete process.env.RESEND_WEBHOOK_SECRET;
    const res = await POST(makeReq({ type: "email.delivered" }) as never);
    expect(res.status).toBe(500);
  });

  it("returns 400 when Svix headers are missing", async () => {
    const req = new Request("http://localhost/api/webhooks/resend", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it("returns 401 on bad signature", async () => {
    verify.mockImplementation(() => {
      throw new Error("bad sig");
    });
    const res = await POST(makeReq({ type: "email.delivered" }) as never);
    expect(res.status).toBe(401);
  });

  it("acks when no email_id in payload", async () => {
    verify.mockReturnValue({ type: "email.delivered", data: {} });
    const res = await POST(makeReq({ type: "email.delivered", data: {} }) as never);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ignored).toBe("no_email_id");
  });

  it("acks when no matching row", async () => {
    verify.mockReturnValue({
      type: "email.delivered",
      data: { email_id: "res-missing" },
    });
    const { supabase, setResult } = createMockSupabase();
    setResult("email_communications", { data: null });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    const res = await POST(makeReq({}) as never);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ignored).toBe("no_matching_row");
    expect(enqueueOrLog).not.toHaveBeenCalled();
  });

  it("on email.delivered: updates row + emits outbox event", async () => {
    verify.mockReturnValue({
      type: "email.delivered",
      created_at: "2026-05-17T10:00:00Z",
      data: { email_id: "res-msg-1" },
    });
    const { supabase, setResult, chain } = createMockSupabase();
    setResult("email_communications", {
      data: { id: "row-1", team_id: "team-1", contact_id: "c-1", status: "sent" },
    });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    const res = await POST(makeReq({}) as never);
    expect(res.status).toBe(200);

    const updateMock = chain.update as unknown as { mock: { calls: unknown[][] } };
    const updateArg = updateMock.mock.calls[0]?.[0] as { status: string; delivered_at: string };
    expect(updateArg.status).toBe("delivered");
    expect(updateArg.delivered_at).toBe("2026-05-17T10:00:00Z");

    expect(enqueueOrLog).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({ eventType: "email.delivered", entityId: "row-1" }),
    );
  });

  it("on email.bounced: stamps bounced_at + failure_reason", async () => {
    verify.mockReturnValue({
      type: "email.bounced",
      created_at: "2026-05-17T11:00:00Z",
      data: { email_id: "res-msg-2" },
    });
    const { supabase, setResult, chain } = createMockSupabase();
    setResult("email_communications", { data: { id: "row-2", team_id: "team-1" } });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    await POST(makeReq({}) as never);

    const updateMock = chain.update as unknown as { mock: { calls: unknown[][] } };
    const updateArg = updateMock.mock.calls[0]?.[0] as { status: string; bounced_at: string };
    expect(updateArg.status).toBe("bounced");
    expect(updateArg.bounced_at).toBe("2026-05-17T11:00:00Z");
  });

  it("on email.opened: only stamps opened_at (no status overwrite)", async () => {
    verify.mockReturnValue({
      type: "email.opened",
      created_at: "2026-05-17T12:00:00Z",
      data: { email_id: "res-msg-3" },
    });
    const { supabase, setResult, chain } = createMockSupabase();
    setResult("email_communications", { data: { id: "row-3", team_id: "team-1", status: "delivered" } });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    await POST(makeReq({}) as never);

    const updateMock = chain.update as unknown as { mock: { calls: unknown[][] } };
    const updateArg = updateMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(updateArg).toEqual({ opened_at: "2026-05-17T12:00:00Z" });
  });

  it("does not emit outbox event for email.sent (we already did it on send)", async () => {
    verify.mockReturnValue({
      type: "email.sent",
      data: { email_id: "res-msg-4" },
    });
    const { supabase, setResult } = createMockSupabase();
    setResult("email_communications", { data: { id: "row-4", team_id: "team-1" } });
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    await POST(makeReq({}) as never);
    expect(enqueueOrLog).not.toHaveBeenCalled();
  });
});
