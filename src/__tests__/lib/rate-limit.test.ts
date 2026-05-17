import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, __resetRateLimitForTests } from "@/lib/rate-limit";
import { NextRequest } from "next/server";

function makeRequest(path = "/api/test", ip = "127.0.0.1"): NextRequest {
  return new NextRequest(new URL(path, "http://localhost:3000"), {
    headers: { "x-forwarded-for": ip },
  });
}

describe("checkRateLimit (in-memory fallback)", () => {
  beforeEach(() => {
    __resetRateLimitForTests();
  });

  it("allows requests under the limit", async () => {
    const req = makeRequest("/api/rl-test-1", "10.0.0.1");
    const result = await checkRateLimit(req, { limit: 5, windowMs: 60_000 });
    expect(result).toBeNull();
  });

  it("blocks after exceeding limit", async () => {
    const ip = "10.0.0.2";
    const path = "/api/rl-test-2";

    for (let i = 0; i < 3; i++) {
      const res = await checkRateLimit(makeRequest(path, ip), { limit: 3, windowMs: 60_000 });
      expect(res).toBeNull();
    }

    const blocked = await checkRateLimit(makeRequest(path, ip), { limit: 3, windowMs: 60_000 });
    expect(blocked).not.toBeNull();
    expect(blocked!.status).toBe(429);
  });

  it("differentiates between IPs", async () => {
    const path = "/api/rl-test-3";

    for (let i = 0; i < 2; i++) {
      await checkRateLimit(makeRequest(path, "10.0.0.3"), { limit: 2, windowMs: 60_000 });
    }

    const blocked = await checkRateLimit(makeRequest(path, "10.0.0.3"), { limit: 2, windowMs: 60_000 });
    expect(blocked).not.toBeNull();

    const allowed = await checkRateLimit(makeRequest(path, "10.0.0.4"), { limit: 2, windowMs: 60_000 });
    expect(allowed).toBeNull();
  });

  it("differentiates between paths", async () => {
    const ip = "10.0.0.5";

    for (let i = 0; i < 2; i++) {
      await checkRateLimit(makeRequest("/api/rl-path-a", ip), { limit: 2, windowMs: 60_000 });
    }

    expect(
      await checkRateLimit(makeRequest("/api/rl-path-a", ip), { limit: 2, windowMs: 60_000 }),
    ).not.toBeNull();

    expect(
      await checkRateLimit(makeRequest("/api/rl-path-b", ip), { limit: 2, windowMs: 60_000 }),
    ).toBeNull();
  });

  it("returns correct 429 headers", async () => {
    const ip = "10.0.0.6";
    const path = "/api/rl-test-headers";

    await checkRateLimit(makeRequest(path, ip), { limit: 1, windowMs: 30_000 });
    const blocked = await checkRateLimit(makeRequest(path, ip), { limit: 1, windowMs: 30_000 });

    expect(blocked).not.toBeNull();
    expect(blocked!.headers.get("Retry-After")).toBe("30");
    expect(blocked!.headers.get("X-RateLimit-Limit")).toBe("1");
    expect(blocked!.headers.get("X-RateLimit-Remaining")).toBe("0");
  });
});
