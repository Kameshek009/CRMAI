import { describe, it, expect } from "vitest";
import { escapeCsvValue, rowToCsv, ENTITY_CONFIG } from "@/lib/crm/export-utils";

describe("escapeCsvValue", () => {
  it("returns empty string for null", () => {
    expect(escapeCsvValue(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(escapeCsvValue(undefined)).toBe("");
  });

  it("wraps values with commas in quotes", () => {
    expect(escapeCsvValue("hello, world")).toBe('"hello, world"');
  });

  it("escapes double quotes", () => {
    expect(escapeCsvValue('say "hello"')).toBe('"say ""hello"""');
  });

  it("wraps values with newlines", () => {
    expect(escapeCsvValue("line1\nline2")).toBe('"line1\nline2"');
  });

  it("leaves plain values as-is", () => {
    expect(escapeCsvValue("hello")).toBe("hello");
  });

  it("converts numbers to string", () => {
    expect(escapeCsvValue(42)).toBe("42");
  });

  it("converts boolean to string", () => {
    expect(escapeCsvValue(true)).toBe("true");
  });
});

describe("rowToCsv", () => {
  it("maps columns in correct order", () => {
    const row = { name: "Alice", email: "a@b.com", id: "123" };
    expect(rowToCsv(row, ["id", "name", "email"])).toBe("123,Alice,a@b.com");
  });

  it("handles missing columns", () => {
    const row = { name: "Alice" };
    expect(rowToCsv(row, ["id", "name"])).toBe(",Alice");
  });

  it("escapes values with special characters", () => {
    const row = { name: "Doe, John", notes: 'He said "hi"' };
    expect(rowToCsv(row, ["name", "notes"])).toBe('"Doe, John","He said ""hi"""');
  });
});

describe("ENTITY_CONFIG", () => {
  it("defines contacts entity", () => {
    expect(ENTITY_CONFIG.contacts).toBeDefined();
    expect(ENTITY_CONFIG.contacts!.table).toBe("contacts");
    expect(ENTITY_CONFIG.contacts!.columns).toContain("email");
  });

  it("defines deals entity", () => {
    expect(ENTITY_CONFIG.deals).toBeDefined();
    expect(ENTITY_CONFIG.deals!.columns).toContain("value");
  });

  it("defines companies entity", () => {
    expect(ENTITY_CONFIG.companies).toBeDefined();
    expect(ENTITY_CONFIG.companies!.columns).toContain("name");
  });

  it("defines tasks entity", () => {
    expect(ENTITY_CONFIG.tasks).toBeDefined();
    expect(ENTITY_CONFIG.tasks!.columns).toContain("status");
  });
});
