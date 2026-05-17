import { describe, it, expect } from "vitest";
import { evaluateOperator, getFieldValue } from "@/lib/lead-scoring/operators";

describe("getFieldValue", () => {
  it("returns top-level fields", () => {
    expect(getFieldValue({ phone: "555" }, "phone")).toBe("555");
  });

  it("walks dotted paths", () => {
    expect(getFieldValue({ metadata: { budget: 5000 } }, "metadata.budget")).toBe(5000);
  });

  it("returns undefined for missing or nullish intermediate hops", () => {
    expect(getFieldValue({ metadata: null }, "metadata.budget")).toBeUndefined();
    expect(getFieldValue({}, "metadata.budget")).toBeUndefined();
    expect(getFieldValue(null, "x")).toBeUndefined();
  });

  it("returns undefined for empty path", () => {
    expect(getFieldValue({ x: 1 }, "")).toBeUndefined();
  });
});

describe("evaluateOperator", () => {
  describe("exists / not_exists", () => {
    it("treats undefined and null as not exist", () => {
      expect(evaluateOperator(undefined, "exists", null)).toBe(false);
      expect(evaluateOperator(null, "exists", null)).toBe(false);
      expect(evaluateOperator("", "exists", null)).toBe(true);
      expect(evaluateOperator(undefined, "not_exists", null)).toBe(true);
    });
  });

  describe("empty / not_empty", () => {
    it("treats empty string and empty array as empty", () => {
      expect(evaluateOperator("", "empty", null)).toBe(true);
      expect(evaluateOperator("   ", "empty", null)).toBe(true);
      expect(evaluateOperator([], "empty", null)).toBe(true);
      expect(evaluateOperator("foo", "empty", null)).toBe(false);
    });

    it("not_empty is the inverse", () => {
      expect(evaluateOperator("foo", "not_empty", null)).toBe(true);
      expect(evaluateOperator(null, "not_empty", null)).toBe(false);
    });
  });

  describe("eq / ne with loose coercion", () => {
    it("compares strings case-insensitively", () => {
      expect(evaluateOperator("Referral", "eq", "referral")).toBe(true);
      expect(evaluateOperator("Referral", "ne", "other")).toBe(true);
    });

    it("coerces numbers and strings", () => {
      expect(evaluateOperator("5", "eq", 5)).toBe(true);
      expect(evaluateOperator(true, "eq", "true")).toBe(true);
    });

    it("does not match null vs string", () => {
      expect(evaluateOperator(null, "eq", "anything")).toBe(false);
    });
  });

  describe("gt / lt / gte / lte", () => {
    it("compares numbers", () => {
      expect(evaluateOperator(10, "gt", 5)).toBe(true);
      expect(evaluateOperator(5, "gt", 5)).toBe(false);
      expect(evaluateOperator(5, "gte", 5)).toBe(true);
      expect(evaluateOperator(5, "lt", 10)).toBe(true);
      expect(evaluateOperator(5, "lte", 5)).toBe(true);
    });

    it("coerces numeric strings", () => {
      expect(evaluateOperator("100", "gt", "50")).toBe(true);
    });

    it("returns false when either side is not numeric", () => {
      expect(evaluateOperator("not-a-number", "gt", 5)).toBe(false);
      expect(evaluateOperator(null, "gt", 5)).toBe(false);
    });
  });

  describe("contains / starts_with / ends_with", () => {
    it("substring match case-insensitively", () => {
      expect(evaluateOperator("Hello World", "contains", "world")).toBe(true);
      expect(evaluateOperator("Hello", "starts_with", "HE")).toBe(true);
      expect(evaluateOperator("file.csv", "ends_with", "CSV")).toBe(true);
    });

    it("contains on array uses element equality", () => {
      expect(evaluateOperator(["VIP", "warm"], "contains", "vip")).toBe(true);
      expect(evaluateOperator(["a", "b"], "contains", "c")).toBe(false);
    });

    it("not_contains inverts", () => {
      expect(evaluateOperator("Hello", "not_contains", "world")).toBe(true);
    });
  });

  describe("in / not_in", () => {
    it("matches when value is in the target list", () => {
      expect(evaluateOperator("qualified", "in", ["qualified", "contacted"])).toBe(true);
      expect(evaluateOperator("junk", "in", ["qualified", "contacted"])).toBe(false);
    });

    it("returns true for not_in when target is not an array", () => {
      expect(evaluateOperator("x", "not_in", "not-an-array")).toBe(true);
    });
  });

  describe("regex", () => {
    it("matches when the regex applies", () => {
      expect(evaluateOperator("CEO of Acme", "regex", "(?i)ceo|cto")).toBe(true);
    });

    it("returns false for invalid regex without throwing", () => {
      expect(evaluateOperator("foo", "regex", "(")).toBe(false);
    });

    it("returns false when field is not stringable", () => {
      expect(evaluateOperator(null, "regex", "foo")).toBe(false);
    });
  });
});
