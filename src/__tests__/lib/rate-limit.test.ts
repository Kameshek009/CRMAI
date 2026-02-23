import { describe, it, expect } from "vitest";
import { checkRateLimit } from "@/lib/rate-limit";
import { NextRequest } from "next/server";

function makeRequest(path = "/api/test", ip = "127.0.0.1"): NextRequest {
  return new NextRequest(new URL(path, "http://localhost:3000"), {
    headers: { "x-forwarded-for": ip },
  });
}

describe("checkRateLimit", () => {
  it("allows requests under the limit", () => {
    const req = makeRequest("/api/rl-test-1", "10.0.0.1");
    const result = checkRateLimit(req, { limit: 5, windowMs: 60_000 });
    expect(result).toBeNull();
  });

  it("blocks after exceeding limit", () => {
    const ip = "10.0.0.2";
    const path = "/api/rl-test-2";

    for (let i = 0; i < 3; i++) {
      const res = checkRateLimit(makeRequest(path, ip), { limit: 3, windowMs: 60_000 });
      expect(res).toBeNull();
    }

    // 4th request should be blocked
    const blocked = checkRateLimit(makeRequest(path, ip), { limit: 3, windowMs: 60_000 });
    expect(blocked).not.toBeNull();
    expect(blocked!.status).toBe(429);
  });

  it("differentiates between IPs", () => {
    const path = "/api/rl-test-3";

    // Fill up limit for IP1
    for (let i = 0; i < 2; i++) {
      checkRateLimit(makeRequest(path, "10.0.0.3"), { limit: 2, windowMs: 60_000 });
    }

    // IP1 should be blocked
    const blocked = checkRateLimit(makeRequest(path, "10.0.0.3"), { limit: 2, windowMs: 60_000 });
    expect(blocked).not.toBeNull();

    // IP2 should still be allowed
    const allowed = checkRateLimit(makeRequest(path, "10.0.0.4"), { limit: 2, windowMs: 60_000 });
    expect(allowed).toBeNull();
  });

  it("differentiates between paths", () => {
    const ip = "10.0.0.5";

    // Fill up limit for path1
    for (let i = 0; i < 2; i++) {
      checkRateLimit(makeRequest("/api/rl-path-a", ip), { limit: 2, windowMs: 60_000 });
    }

    // path1 should be blocked
    expect(checkRateLimit(makeRequest("/api/rl-path-a", ip), { limit: 2, windowMs: 60_000 })).not.toBeNull();

    // path2 should still be allowed
    expect(checkRateLimit(makeRequest("/api/rl-path-b", ip), { limit: 2, windowMs: 60_000 })).toBeNull();
  });

  it("returns correct 429 headers", () => {
    const ip = "10.0.0.6";
    const path = "/api/rl-test-headers";

    checkRateLimit(makeRequest(path, ip), { limit: 1, windowMs: 30_000 });
    const blocked = checkRateLimit(makeRequest(path, ip), { limit: 1, windowMs: 30_000 });

    expect(blocked).not.toBeNull();
    expect(blocked!.headers.get("Retry-After")).toBe("30");
    expect(blocked!.headers.get("X-RateLimit-Limit")).toBe("1");
    expect(blocked!.headers.get("X-RateLimit-Remaining")).toBe("0");
  });
});
