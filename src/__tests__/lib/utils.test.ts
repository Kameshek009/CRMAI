import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  cn,
  formatNumber,
  formatCompact,
  formatCurrency,
  calculatePercentage,
  formatRelativeTime,
  getDaysRemaining,
  getBillingCycleEnd,
  truncate,
  sleep,
  getTierColor,
  getStatusColor,
} from "@/lib/utils";

describe("cn", () => {
  it("merges multiple class strings", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });
  it("handles conditional classes", () => {
    expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
  });
  it("merges Tailwind classes correctly", () => {
    expect(cn("p-4", "p-8")).toBe("p-8");
  });
  it("handles empty input", () => {
    expect(cn()).toBe("");
  });
});

describe("formatNumber", () => {
  it("formats number with commas", () => {
    expect(formatNumber(1000)).toBe("1,000");
  });
  it("formats large numbers", () => {
    expect(formatNumber(1000000)).toBe("1,000,000");
  });
  it("handles zero", () => {
    expect(formatNumber(0)).toBe("0");
  });
  it("handles negative numbers", () => {
    expect(formatNumber(-5000)).toBe("-5,000");
  });
});

describe("formatCompact", () => {
  it("formats thousands as K", () => {
    expect(formatCompact(10000)).toBe("10K");
  });
  it("formats millions as M", () => {
    expect(formatCompact(1500000)).toBe("1.5M");
  });
  it("formats billions as B", () => {
    expect(formatCompact(2000000000)).toBe("2B");
  });
  it("handles small numbers", () => {
    expect(formatCompact(999)).toBe("999");
  });
  it("handles zero", () => {
    expect(formatCompact(0)).toBe("0");
  });
});

describe("formatCurrency", () => {
  it("formats USD with dollar sign", () => {
    expect(formatCurrency(1000)).toBe("$1,000");
  });
  it("formats fractional amounts", () => {
    expect(formatCurrency(99.99)).toBe("$99.99");
  });
  it("handles zero", () => {
    expect(formatCurrency(0)).toBe("$0");
  });
  it("handles large amounts", () => {
    expect(formatCurrency(1000000)).toBe("$1,000,000");
  });
});

describe("calculatePercentage", () => {
  it("calculates percentage correctly", () => {
    expect(calculatePercentage(50, 100)).toBe(50);
  });
  it("rounds percentage", () => {
    expect(calculatePercentage(33, 100)).toBe(33);
  });
  it("caps at 100%", () => {
    expect(calculatePercentage(150, 100)).toBe(100);
  });
  it("returns 0 when total is 0", () => {
    expect(calculatePercentage(0, 0)).toBe(0);
  });
  it("returns 0 when used is 0", () => {
    expect(calculatePercentage(0, 100)).toBe(0);
  });
});

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-26T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "just now" for recent time', () => {
    const date = new Date("2026-02-26T11:59:30Z");
    expect(formatRelativeTime(date)).toBe("just now");
  });
  it("returns minutes ago", () => {
    const date = new Date("2026-02-26T11:30:00Z");
    expect(formatRelativeTime(date)).toBe("30m ago");
  });
  it("returns hours ago", () => {
    const date = new Date("2026-02-26T09:00:00Z");
    expect(formatRelativeTime(date)).toBe("3h ago");
  });
  it("returns days ago", () => {
    const date = new Date("2026-02-23T12:00:00Z");
    expect(formatRelativeTime(date)).toBe("3d ago");
  });
  it("returns formatted date for older dates", () => {
    const date = new Date("2026-02-10T12:00:00Z");
    expect(formatRelativeTime(date)).toBe("Feb 10");
  });
});

describe("getDaysRemaining", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-26T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns days until next month", () => {
    const start = new Date("2026-02-01T00:00:00Z");
    const result = getDaysRemaining(start);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(31);
  });
  it("returns 0 for past cycle", () => {
    const start = new Date("2026-01-01T00:00:00Z");
    expect(getDaysRemaining(start)).toBe(0);
  });
  it("handles edge case of last day", () => {
    vi.setSystemTime(new Date("2026-03-01T00:00:00Z"));
    const start = new Date("2026-02-01T00:00:00Z");
    expect(getDaysRemaining(start)).toBe(0);
  });
});

describe("getBillingCycleEnd", () => {
  it("returns date one month later", () => {
    const start = new Date("2026-02-01T00:00:00Z");
    const end = getBillingCycleEnd(start);
    expect(end.getMonth()).toBe(2); // March (0-indexed)
    expect(end.getDate()).toBe(1);
  });
  it("handles year rollover", () => {
    const start = new Date("2026-12-01T00:00:00Z");
    const end = getBillingCycleEnd(start);
    expect(end.getFullYear()).toBe(2027);
    expect(end.getMonth()).toBe(0); // January
  });
});

describe("truncate", () => {
  it("truncates long strings", () => {
    expect(truncate("Hello World", 8)).toBe("Hello...");
  });
  it("leaves short strings unchanged", () => {
    expect(truncate("Hello", 10)).toBe("Hello");
  });
  it("handles exact length", () => {
    expect(truncate("Hello", 5)).toBe("Hello");
  });
  it("handles empty string", () => {
    expect(truncate("", 5)).toBe("");
  });
  it("handles maxLength smaller than ellipsis", () => {
    expect(truncate("Hello", 3)).toBe("...");
  });
});

describe("sleep", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves after specified time", async () => {
    const promise = sleep(1000);
    vi.advanceTimersByTime(1000);
    await expect(promise).resolves.toBeUndefined();
  });
  it("does not resolve before time", async () => {
    const promise = sleep(1000);
    vi.advanceTimersByTime(500);
    let resolved = false;
    promise.then(() => {
      resolved = true;
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(resolved).toBe(false);
  });
});

describe("getTierColor", () => {
  it('returns "default" for free tier', () => {
    expect(getTierColor("free")).toBe("default");
  });
  it('returns "primary" for pro tier', () => {
    expect(getTierColor("pro")).toBe("primary");
  });
  it('returns "secondary" for max tier', () => {
    expect(getTierColor("max")).toBe("secondary");
  });
  it('returns "warning" for enterprise tier', () => {
    expect(getTierColor("enterprise")).toBe("warning");
  });
  it('returns "default" for unknown tier', () => {
    expect(getTierColor("unknown")).toBe("default");
  });
});

describe("getStatusColor", () => {
  it('returns "success" for active status', () => {
    expect(getStatusColor("active")).toBe("success");
  });
  it('returns "default" for completed status', () => {
    expect(getStatusColor("completed")).toBe("default");
  });
  it('returns "danger" for error status', () => {
    expect(getStatusColor("error")).toBe("danger");
  });
  it('returns "default" for unknown status', () => {
    expect(getStatusColor("unknown")).toBe("default");
  });
});
