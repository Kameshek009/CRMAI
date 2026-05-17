import { describe, it, expect } from "vitest";
import {
  matchesEventType,
  anyPatternMatches,
  nextAttemptDelaySeconds,
  nextAttemptAt,
  shouldGiveUp,
  MAX_DELIVERY_ATTEMPTS,
} from "@/lib/webhooks/dispatcher";

describe("matchesEventType", () => {
  it('"*" matches anything', () => {
    expect(matchesEventType("*", "contact.created")).toBe(true);
    expect(matchesEventType("*", "deal.won")).toBe(true);
    expect(matchesEventType("*", "")).toBe(true);
  });

  it("exact match", () => {
    expect(matchesEventType("contact.created", "contact.created")).toBe(true);
    expect(matchesEventType("contact.created", "contact.updated")).toBe(false);
  });

  it('namespace "contact.*" matches all contact.* events and the bare prefix', () => {
    expect(matchesEventType("contact.*", "contact.created")).toBe(true);
    expect(matchesEventType("contact.*", "contact.updated")).toBe(true);
    expect(matchesEventType("contact.*", "contact")).toBe(true);
    expect(matchesEventType("contact.*", "deal.won")).toBe(false);
    expect(matchesEventType("contact.*", "contacts.created")).toBe(false);
  });

  it("does not match by accidental substring", () => {
    expect(matchesEventType("contact.created", "contact.created.v2")).toBe(false);
    expect(matchesEventType("created", "contact.created")).toBe(false);
  });
});

describe("anyPatternMatches", () => {
  it("returns true when any pattern in the list matches", () => {
    expect(anyPatternMatches(["deal.*", "contact.created"], "contact.created")).toBe(true);
    expect(anyPatternMatches(["deal.*"], "deal.won")).toBe(true);
  });

  it("returns false for empty / null pattern lists", () => {
    expect(anyPatternMatches([], "contact.created")).toBe(false);
    expect(anyPatternMatches(null, "contact.created")).toBe(false);
    expect(anyPatternMatches(undefined, "contact.created")).toBe(false);
  });

  it("returns false when no pattern matches", () => {
    expect(anyPatternMatches(["deal.*", "company.created"], "contact.created")).toBe(false);
  });
});

describe("nextAttemptDelaySeconds", () => {
  it("follows the ladder", () => {
    expect(nextAttemptDelaySeconds(0)).toBe(30);
    expect(nextAttemptDelaySeconds(1)).toBe(120);
    expect(nextAttemptDelaySeconds(2)).toBe(480);
    expect(nextAttemptDelaySeconds(3)).toBe(1800);
    expect(nextAttemptDelaySeconds(4)).toBe(7200);
    expect(nextAttemptDelaySeconds(5)).toBe(21600);
  });

  it("caps at the largest ladder rung for higher attempt counts", () => {
    expect(nextAttemptDelaySeconds(6)).toBe(21600);
    expect(nextAttemptDelaySeconds(100)).toBe(21600);
  });

  it("handles negative input defensively", () => {
    expect(nextAttemptDelaySeconds(-1)).toBe(30);
  });
});

describe("nextAttemptAt", () => {
  it("adds the ladder delay to a base time", () => {
    const base = new Date("2026-01-01T00:00:00.000Z");
    const next = nextAttemptAt(0, base);
    expect(next.getTime() - base.getTime()).toBe(30_000);
  });
});

describe("shouldGiveUp", () => {
  it("gives up at or past MAX_DELIVERY_ATTEMPTS", () => {
    expect(shouldGiveUp(MAX_DELIVERY_ATTEMPTS)).toBe(true);
    expect(shouldGiveUp(MAX_DELIVERY_ATTEMPTS + 1)).toBe(true);
  });

  it("retries while attempts < MAX_DELIVERY_ATTEMPTS", () => {
    expect(shouldGiveUp(0)).toBe(false);
    expect(shouldGiveUp(MAX_DELIVERY_ATTEMPTS - 1)).toBe(false);
  });
});
