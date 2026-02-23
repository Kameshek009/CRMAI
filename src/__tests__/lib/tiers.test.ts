import { describe, it, expect } from "vitest";
import {
  TIER_TOKEN_LIMITS,
  TIER_WEEKLY_LIMITS,
  TIER_MAX_MEMBERS,
  TIER_DISPLAY_NAMES,
  getTierFromLimit,
} from "@/lib/constants/tiers";

const ALL_TIERS = ["free", "pro", "max", "enterprise"] as const;

describe("TIER_TOKEN_LIMITS", () => {
  it("defines all tiers", () => {
    for (const tier of ALL_TIERS) {
      expect(TIER_TOKEN_LIMITS[tier]).toBeDefined();
    }
  });

  it("free has 50K monthly tokens", () => {
    expect(TIER_TOKEN_LIMITS.free).toBe(50_000);
  });

  it("pro has 500K monthly tokens", () => {
    expect(TIER_TOKEN_LIMITS.pro).toBe(500_000);
  });

  it("max has 1.5M monthly tokens", () => {
    expect(TIER_TOKEN_LIMITS.max).toBe(1_500_000);
  });

  it("enterprise is 0 (unlimited)", () => {
    expect(TIER_TOKEN_LIMITS.enterprise).toBe(0);
  });

  it("tiers increase monotonically (free < pro < max)", () => {
    expect(TIER_TOKEN_LIMITS.free).toBeLessThan(TIER_TOKEN_LIMITS.pro);
    expect(TIER_TOKEN_LIMITS.pro).toBeLessThan(TIER_TOKEN_LIMITS.max);
  });
});

describe("TIER_WEEKLY_LIMITS", () => {
  it("defines all tiers", () => {
    for (const tier of ALL_TIERS) {
      expect(TIER_WEEKLY_LIMITS[tier]).toBeDefined();
    }
  });

  it("free has 10K daily tokens", () => {
    expect(TIER_WEEKLY_LIMITS.free).toBe(10_000);
  });
});

describe("TIER_MAX_MEMBERS", () => {
  it("free allows 3 members", () => {
    expect(TIER_MAX_MEMBERS.free).toBe(3);
  });

  it("paid tiers allow 5000 members", () => {
    expect(TIER_MAX_MEMBERS.pro).toBe(5000);
    expect(TIER_MAX_MEMBERS.max).toBe(5000);
  });
});

describe("TIER_DISPLAY_NAMES", () => {
  it("defines all tiers", () => {
    for (const tier of ALL_TIERS) {
      expect(typeof TIER_DISPLAY_NAMES[tier]).toBe("string");
    }
  });
});

describe("getTierFromLimit", () => {
  it("returns max for >= 1.5M", () => {
    expect(getTierFromLimit(1_500_000)).toBe("max");
    expect(getTierFromLimit(2_000_000)).toBe("max");
  });

  it("returns pro for >= 500K", () => {
    expect(getTierFromLimit(500_000)).toBe("pro");
    expect(getTierFromLimit(999_999)).toBe("pro");
  });

  it("returns free for everything else", () => {
    expect(getTierFromLimit(50_000)).toBe("free");
    expect(getTierFromLimit(0)).toBe("free");
  });
});
