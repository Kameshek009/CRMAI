import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createMockSupabase } from "@/__tests__/helpers/mock-supabase";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("next/headers", () => ({ headers: vi.fn() }));

vi.mock("@/lib/stripe/server", () => ({
  stripe: {
    webhooks: { constructEvent: vi.fn() },
    subscriptions: { retrieve: vi.fn(), list: vi.fn() },
  },
  getTierFromPriceId: vi.fn(),
  TIER_TOKEN_LIMITS: { free: 50000, pro: 500000, max: 2000000 },
}));

vi.mock("@/lib/supabase/server", () => ({ createSupabaseAdmin: vi.fn() }));

vi.mock("@/lib/constants/tiers", () => ({
  TIER_MAX_MEMBERS: { free: 3, pro: 10, max: 50 },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

// ── Imports (after mocks) ────────────────────────────────────────────────────

import { POST } from "@/app/api/billing/webhook/route";
import { headers } from "next/headers";
import { stripe, getTierFromPriceId } from "@/lib/stripe/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import type Stripe from "stripe";

type HeadersReturn = Awaited<ReturnType<typeof headers>>;

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body = "raw-body-here"): NextRequest {
  return new NextRequest(
    new URL("/api/billing/webhook", "http://localhost:3000"),
    {
      method: "POST",
      body,
      headers: { "Content-Type": "text/plain" },
    },
  );
}

function mockHeaders(map: Record<string, string> = {}) {
  vi.mocked(headers).mockResolvedValue(new Headers(map) as unknown as HeadersReturn);
}

function mockConstructEvent(event: Record<string, unknown>) {
  vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(event as unknown as Stripe.Event);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/billing/webhook", () => {
  let supabase: ReturnType<typeof createMockSupabase>["supabase"];
  let setResult: ReturnType<typeof createMockSupabase>["setResult"];

  beforeEach(() => {
    vi.clearAllMocks();

    const mock = createMockSupabase();
    supabase = mock.supabase;
    setResult = mock.setResult;
    vi.mocked(createSupabaseAdmin).mockReturnValue(supabase);

    // Ensure the webhook secret env var is present for every test
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
  });

  // ────────────────────────────────────────────────────────────────────────
  // 1. No signature → 400
  // ────────────────────────────────────────────────────────────────────────
  it("returns 400 when no stripe-signature header is present", async () => {
    mockHeaders({}); // no stripe-signature

    const res = await POST(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("No signature");
  });

  // ────────────────────────────────────────────────────────────────────────
  // 2. Signature verification fails → 400
  // ────────────────────────────────────────────────────────────────────────
  it("returns 400 when signature verification fails", async () => {
    mockHeaders({ "stripe-signature": "sig_bad" });
    vi.mocked(stripe.webhooks.constructEvent).mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const res = await POST(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Invalid signature");
  });

  // ────────────────────────────────────────────────────────────────────────
  // 3. Irrelevant event → { received: true }
  // ────────────────────────────────────────────────────────────────────────
  it("returns received: true for irrelevant event types", async () => {
    mockHeaders({ "stripe-signature": "sig_test" });
    mockConstructEvent({ type: "payment_intent.created", id: "evt_1" });

    const res = await POST(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.received).toBe(true);

    // Should NOT have tried to insert into stripe_webhook_events
    expect(supabase.from).not.toHaveBeenCalledWith("stripe_webhook_events");
  });

  // ────────────────────────────────────────────────────────────────────────
  // 4. Duplicate event (idempotency) → { received: true }
  // ────────────────────────────────────────────────────────────────────────
  it("skips duplicate events based on idempotency check", async () => {
    mockHeaders({ "stripe-signature": "sig_test" });
    mockConstructEvent({
      type: "checkout.session.completed",
      id: "evt_dup",
      data: { object: {} },
    });

    // Unique violation on stripe_webhook_events insert
    setResult("stripe_webhook_events", {
      data: null,
      error: { code: "23505", message: "duplicate key value" },
    });

    const res = await POST(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.received).toBe(true);

    // Should have attempted insert for idempotency
    expect(supabase.from).toHaveBeenCalledWith("stripe_webhook_events");
  });

  // ────────────────────────────────────────────────────────────────────────
  // 5. checkout.session.completed → team upgraded
  // ────────────────────────────────────────────────────────────────────────
  it("handles checkout.session.completed successfully", async () => {
    mockHeaders({ "stripe-signature": "sig_test" });
    mockConstructEvent({
      type: "checkout.session.completed",
      id: "evt_checkout_1",
      data: {
        object: {
          id: "cs_123",
          customer: "cus_abc",
          subscription: "sub_xyz",
          metadata: {
            team_id: "team-1",
            account_id: "acc-1",
            tier: "pro",
          },
          amount_total: 2900,
          currency: "usd",
        },
      },
    });

    // Idempotency insert succeeds
    setResult("stripe_webhook_events", { data: null, error: null });

    // stripe.subscriptions.retrieve returns seat quantity
    vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue({
      items: { data: [{ quantity: 5 }] },
    } as unknown as Stripe.Response<Stripe.Subscription>);

    // Team update succeeds
    setResult("teams", { data: null, error: null });

    // Activity log insert
    setResult("activity_logs", { data: null, error: null });

    // Payment history insert
    setResult("payment_history", { data: null, error: null });

    const res = await POST(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.received).toBe(true);

    // Verify subscription retrieve was called
    expect(stripe.subscriptions.retrieve).toHaveBeenCalledWith("sub_xyz");

    // Verify team was updated
    expect(supabase.from).toHaveBeenCalledWith("teams");
  });

  // ────────────────────────────────────────────────────────────────────────
  // 6. customer.subscription.deleted → downgrade to free
  // ────────────────────────────────────────────────────────────────────────
  it("handles customer.subscription.deleted and downgrades team to free", async () => {
    mockHeaders({ "stripe-signature": "sig_test" });
    mockConstructEvent({
      type: "customer.subscription.deleted",
      id: "evt_del_1",
      data: {
        object: {
          id: "sub_deleted",
          customer: "cus_del",
        },
      },
    });

    // Idempotency insert succeeds
    setResult("stripe_webhook_events", { data: null, error: null });

    // Team found by stripe_customer_id
    setResult("teams", {
      data: {
        id: "team-2",
        tier: "pro",
        stripe_subscription_id: "sub_deleted",
        owner_account_id: "acc-2",
      },
      error: null,
    });

    // No other active subscriptions for this customer
    vi.mocked(stripe.subscriptions.list).mockResolvedValue({
      data: [],
    } as never);

    // Team update (downgrade) succeeds
    setResult("teams", { data: null, error: null });

    // Activity log insert
    setResult("activity_logs", { data: null, error: null });

    const res = await POST(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.received).toBe(true);

    // Verify active subscription check
    expect(stripe.subscriptions.list).toHaveBeenCalledWith({
      customer: "cus_del",
      status: "active",
      limit: 1,
    });

    // Verify team table was accessed for both lookup and update
    expect(supabase.from).toHaveBeenCalledWith("teams");
  });
});
