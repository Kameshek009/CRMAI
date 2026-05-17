import { describe, it, expect, vi, beforeEach } from "vitest";

const sendViaResend = vi.fn();
vi.mock("@/lib/email/resend-client", () => ({
  sendViaResend: (...args: unknown[]) => sendViaResend(...args),
  __resetResendClientCache: vi.fn(),
}));

const enqueueOrLog = vi.fn();
vi.mock("@/lib/outbox/enqueue", () => ({
  enqueueOrLog: (...args: unknown[]) => enqueueOrLog(...args),
  enqueueOutboxEvent: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { sendEmail, defaultFromAddress } from "@/lib/email/send";
import { createMockSupabase } from "../helpers/mock-supabase";

const baseInput = {
  teamId: "team-1",
  accountId: "acc-1",
  contactId: "contact-1",
  from: "Nexxus <no-reply@example.com>",
  to: ["recipient@example.com"],
  subject: "hi",
  text: "hello world",
};

describe("sendEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserts queued row, calls Resend, marks sent on success, emits email.sent", async () => {
    const { supabase, setResult, chain } = createMockSupabase();
    setResult("email_communications", { data: { id: "row-1" }, error: null });
    sendViaResend.mockResolvedValue({ ok: true, providerMessageId: "res-msg-42" });

    const res = await sendEmail(supabase, baseInput);

    expect(res).toEqual({ ok: true, id: "row-1", providerMessageId: "res-msg-42" });

    // INSERT was called with status='queued'
    const insertArg = (chain.insert as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]?.[0] as {
      status: string;
      provider: string;
    };
    expect(insertArg.status).toBe("queued");
    expect(insertArg.provider).toBe("resend");

    // Final UPDATE patched status to 'sent' with the provider id
    const updateCalls = (chain.update as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    const sentUpdate = updateCalls.find(
      (c) => (c[0] as { status?: string }).status === "sent",
    )?.[0] as { provider_message_id: string };
    expect(sentUpdate.provider_message_id).toBe("res-msg-42");

    expect(enqueueOrLog).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        eventType: "email.sent",
        entityType: "email",
        entityId: "row-1",
      }),
    );
  });

  it("marks row failed and surfaces error when Resend rejects", async () => {
    const { supabase, setResult, chain } = createMockSupabase();
    setResult("email_communications", { data: { id: "row-2" }, error: null });
    sendViaResend.mockResolvedValue({ ok: false, error: "resend_down" });

    const res = await sendEmail(supabase, baseInput);

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.id).toBe("row-2");
      expect(res.error).toBe("resend_down");
    }

    const updateCalls = (chain.update as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    const failedUpdate = updateCalls.find(
      (c) => (c[0] as { status?: string }).status === "failed",
    )?.[0] as { failure_reason: string };
    expect(failedUpdate.failure_reason).toBe("resend_down");

    expect(enqueueOrLog).not.toHaveBeenCalled();
  });

  it("returns no_recipient without inserting when 'to' is empty", async () => {
    const { supabase, chain } = createMockSupabase();
    const res = await sendEmail(supabase, { ...baseInput, to: [] });
    expect(res).toEqual({ ok: false, error: "no_recipient" });
    expect(chain.insert).not.toHaveBeenCalled();
  });

  it("returns empty_body without inserting when no html/text", async () => {
    const { supabase, chain } = createMockSupabase();
    const { text: _text, ...rest } = baseInput;
    void _text;
    const res = await sendEmail(supabase, rest);
    expect(res).toEqual({ ok: false, error: "empty_body" });
    expect(chain.insert).not.toHaveBeenCalled();
  });

  it("returns no_from_address_configured when from is missing and env not set", async () => {
    const prevAddr = process.env.EMAIL_FROM_ADDRESS;
    const prevDomain = process.env.EMAIL_FROM_DOMAIN;
    delete process.env.EMAIL_FROM_ADDRESS;
    delete process.env.EMAIL_FROM_DOMAIN;
    try {
      const { supabase } = createMockSupabase();
      const { from: _from, ...rest } = baseInput;
      void _from;
      const res = await sendEmail(supabase, rest);
      expect(res).toEqual({ ok: false, error: "no_from_address_configured" });
    } finally {
      if (prevAddr !== undefined) process.env.EMAIL_FROM_ADDRESS = prevAddr;
      if (prevDomain !== undefined) process.env.EMAIL_FROM_DOMAIN = prevDomain;
    }
  });
});

describe("defaultFromAddress", () => {
  it("prefers EMAIL_FROM_ADDRESS", () => {
    process.env.EMAIL_FROM_ADDRESS = "Foo <foo@bar.com>";
    process.env.EMAIL_FROM_DOMAIN = "qux.com";
    expect(defaultFromAddress()).toBe("Foo <foo@bar.com>");
  });

  it("falls back to no-reply@EMAIL_FROM_DOMAIN", () => {
    delete process.env.EMAIL_FROM_ADDRESS;
    process.env.EMAIL_FROM_DOMAIN = "qux.com";
    expect(defaultFromAddress()).toBe("Nexxus <no-reply@qux.com>");
  });

  it("returns null when neither is set", () => {
    delete process.env.EMAIL_FROM_ADDRESS;
    delete process.env.EMAIL_FROM_DOMAIN;
    expect(defaultFromAddress()).toBeNull();
  });
});
