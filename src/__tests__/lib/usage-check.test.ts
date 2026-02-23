import { describe, it, expect } from "vitest";
import {
  checkTeamUsageAllowed,
  calculateTeamUsageStats,
  formatTokenCount,
  type TeamBillingData,
} from "@/lib/usage/check";

function makeTeam(overrides: Partial<TeamBillingData> = {}): TeamBillingData {
  return {
    tier: "free",
    token_limit: 50_000,
    tokens_used: 0,
    weekly_tokens_used: 0,
    week_start_date: new Date().toISOString(),
    billing_cycle_start: new Date().toISOString(),
    seat_count: 1,
    ...overrides,
  };
}

describe("checkTeamUsageAllowed", () => {
  it("allows enterprise users always", () => {
    const result = checkTeamUsageAllowed(makeTeam({ tier: "enterprise" }), 999_999);
    expect(result.allowed).toBe(true);
  });

  it("allows when under both limits", () => {
    const result = checkTeamUsageAllowed(makeTeam({ tokens_used: 100, weekly_tokens_used: 100 }), 500);
    expect(result.allowed).toBe(true);
  });

  it("blocks when daily limit exceeded", () => {
    const result = checkTeamUsageAllowed(
      makeTeam({ weekly_tokens_used: 9_500 }),
      1_000
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("weekly_cap_exceeded");
  });

  it("blocks when monthly limit exceeded", () => {
    const result = checkTeamUsageAllowed(
      makeTeam({ tokens_used: 49_500 }),
      1_000
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("monthly_cap_exceeded");
  });

  it("resets daily usage after 24h", () => {
    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    const result = checkTeamUsageAllowed(
      makeTeam({ weekly_tokens_used: 99_999, week_start_date: oldDate }),
      500
    );
    expect(result.allowed).toBe(true);
  });

  it("includes upgradeOptions when blocked", () => {
    const result = checkTeamUsageAllowed(
      makeTeam({ weekly_tokens_used: 9_500 }),
      1_000
    );
    expect(result.allowed).toBe(false);
    expect(result.upgradeOptions).toContain("pro");
  });
});

describe("calculateTeamUsageStats", () => {
  it("calculates percentages correctly", () => {
    const stats = calculateTeamUsageStats(makeTeam({ tokens_used: 25_000, token_limit: 50_000 }));
    expect(stats.percentUsed).toBe(50);
  });

  it("handles enterprise as unlimited", () => {
    const stats = calculateTeamUsageStats(makeTeam({ tier: "enterprise", token_limit: 0 }));
    expect(stats.isEnterprise).toBe(true);
  });

  it("clamps percentUsed to 100", () => {
    const stats = calculateTeamUsageStats(makeTeam({ tokens_used: 100_000, token_limit: 50_000 }));
    expect(stats.percentUsed).toBe(100);
  });

  it("calculates tokensRemaining", () => {
    const stats = calculateTeamUsageStats(makeTeam({ tokens_used: 30_000, token_limit: 50_000 }));
    expect(stats.tokensRemaining).toBe(20_000);
  });
});

describe("formatTokenCount", () => {
  it("formats millions", () => {
    expect(formatTokenCount(1_500_000)).toBe("1.5M");
  });

  it("formats exact millions", () => {
    expect(formatTokenCount(1_000_000)).toBe("1M");
  });

  it("formats thousands", () => {
    expect(formatTokenCount(50_000)).toBe("50K");
  });

  it("formats exact thousands", () => {
    expect(formatTokenCount(10_000)).toBe("10K");
  });

  it("returns raw number for small values", () => {
    expect(formatTokenCount(500)).toBe("500");
  });

  it("returns zero", () => {
    expect(formatTokenCount(0)).toBe("0");
  });
});
