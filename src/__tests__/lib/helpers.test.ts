import { describe, it, expect } from "vitest";
import {
  isValidUUID,
  getInitials,
  formatDealValue,
  getContactDisplayName,
  sanitizeLike,
  parsePagination,
} from "@/lib/crm/helpers";

describe("isValidUUID", () => {
  it("accepts valid UUID v4", () => {
    expect(isValidUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });
  it("accepts uppercase UUID", () => {
    expect(isValidUUID("550E8400-E29B-41D4-A716-446655440000")).toBe(true);
  });
  it("rejects empty string", () => {
    expect(isValidUUID("")).toBe(false);
  });
  it("rejects non-UUID string", () => {
    expect(isValidUUID("not-a-uuid")).toBe(false);
  });
  it("rejects partial UUID", () => {
    expect(isValidUUID("550e8400-e29b-41d4")).toBe(false);
  });
});

describe("getInitials", () => {
  it("returns first+last initials", () => {
    expect(getInitials("John", "Doe")).toBe("JD");
  });
  it("returns only first initial when no lastName", () => {
    expect(getInitials("John")).toBe("J");
  });
  it("handles null lastName", () => {
    expect(getInitials("Alice", null)).toBe("A");
  });
  it("uppercases initials", () => {
    expect(getInitials("john", "doe")).toBe("JD");
  });
});

describe("formatDealValue", () => {
  it("formats USD by default", () => {
    expect(formatDealValue(5000)).toBe("$5,000");
  });
  it("formats other currencies", () => {
    const result = formatDealValue(1000, "EUR");
    expect(result).toContain("1,000");
  });
  it("handles zero", () => {
    expect(formatDealValue(0)).toBe("$0");
  });
  it("handles large numbers", () => {
    expect(formatDealValue(1000000)).toBe("$1,000,000");
  });
});

describe("getContactDisplayName", () => {
  it("returns full name", () => {
    expect(getContactDisplayName("John", "Doe")).toBe("John Doe");
  });
  it("returns only first name when no last", () => {
    expect(getContactDisplayName("Alice")).toBe("Alice");
  });
  it("handles null lastName", () => {
    expect(getContactDisplayName("Bob", null)).toBe("Bob");
  });
});

describe("sanitizeLike", () => {
  it("escapes % character", () => {
    expect(sanitizeLike("50%")).toBe("50\\%");
  });
  it("escapes _ character", () => {
    expect(sanitizeLike("user_name")).toBe("user\\_name");
  });
  it("escapes backslash", () => {
    expect(sanitizeLike("path\\file")).toBe("path\\\\file");
  });
  it("leaves normal text unchanged", () => {
    expect(sanitizeLike("hello world")).toBe("hello world");
  });
  it("escapes multiple special chars", () => {
    expect(sanitizeLike("a%b_c\\d")).toBe("a\\%b\\_c\\\\d");
  });
});

describe("parsePagination", () => {
  it("returns defaults for empty params", () => {
    const params = new URLSearchParams();
    expect(parsePagination(params)).toEqual({ page: 1, limit: 25, offset: 0 });
  });
  it("parses page and limit", () => {
    const params = new URLSearchParams({ page: "3", limit: "10" });
    expect(parsePagination(params)).toEqual({ page: 3, limit: 10, offset: 20 });
  });
  it("clamps page to minimum 1", () => {
    const params = new URLSearchParams({ page: "0" });
    expect(parsePagination(params).page).toBe(1);
  });
  it("clamps limit to max 100", () => {
    const params = new URLSearchParams({ limit: "999" });
    expect(parsePagination(params).limit).toBe(100);
  });
  it("clamps limit to min 1", () => {
    const params = new URLSearchParams({ limit: "0" });
    expect(parsePagination(params).limit).toBe(1);
  });
  it("handles non-numeric values", () => {
    const params = new URLSearchParams({ page: "abc", limit: "xyz" });
    const result = parsePagination(params);
    // parseInt("abc") = NaN, Math.max(1, NaN) = NaN
    expect(result.page).toBeNaN();
    expect(result.limit).toBeNaN();
  });
});
