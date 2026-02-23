import { describe, it, expect } from "vitest";
import { computeChanges } from "@/lib/crm/audit";

describe("computeChanges", () => {
  it("detects changed fields", () => {
    const old = { name: "Alice", email: "a@b.com", phone: "123" };
    const update = { name: "Bob", email: "a@b.com" };
    const result = computeChanges(old, update);
    expect(result).toEqual({
      name: { old: "Alice", new: "Bob" },
    });
  });

  it("returns undefined when nothing changed", () => {
    const old = { name: "Alice", email: "a@b.com" };
    const update = { name: "Alice", email: "a@b.com" };
    expect(computeChanges(old, update)).toBeUndefined();
  });

  it("detects null to value change", () => {
    const old = { name: "Alice", phone: null };
    const update = { phone: "555-1234" };
    const result = computeChanges(old, update);
    expect(result).toEqual({
      phone: { old: null, new: "555-1234" },
    });
  });

  it("detects value to null change", () => {
    const old = { name: "Alice", phone: "555" };
    const update = { phone: null };
    const result = computeChanges(old, update);
    expect(result).toEqual({
      phone: { old: "555", new: null },
    });
  });

  it("handles nested objects", () => {
    const old = { metadata: { key: "val1" } };
    const update = { metadata: { key: "val2" } };
    const result = computeChanges(old, update);
    expect(result).toEqual({
      metadata: { old: { key: "val1" }, new: { key: "val2" } },
    });
  });

  it("handles new fields not present in old record", () => {
    const old = { name: "Alice" };
    const update = { tags: ["vip"] };
    const result = computeChanges(old, update);
    expect(result).toEqual({
      tags: { old: undefined, new: ["vip"] },
    });
  });
});
