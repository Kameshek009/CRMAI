import { describe, it, expect } from "vitest";
import { hasScope, hasAllScopes } from "@/lib/api-auth/scopes";

describe("hasScope", () => {
  it("returns true on exact match", () => {
    expect(hasScope(["contacts:read"], "contacts:read")).toBe(true);
  });

  it("returns false on no match", () => {
    expect(hasScope(["contacts:read"], "contacts:write")).toBe(false);
  });

  it("global wildcard grants everything", () => {
    expect(hasScope(["*"], "anything:at:all")).toBe(true);
  });

  it("namespace wildcard grants actions under the namespace", () => {
    expect(hasScope(["contacts:*"], "contacts:read")).toBe(true);
    expect(hasScope(["contacts:*"], "contacts:write")).toBe(true);
    expect(hasScope(["contacts:*"], "deals:read")).toBe(false);
  });

  it("namespace wildcard matches the namespace literal itself", () => {
    expect(hasScope(["contacts:*"], "contacts")).toBe(true);
  });

  it("returns false for empty granted scopes", () => {
    expect(hasScope([], "contacts:read")).toBe(false);
  });
});

describe("hasAllScopes", () => {
  it("requires every scope to be granted", () => {
    expect(hasAllScopes(["contacts:read", "deals:read"], ["contacts:read"])).toBe(true);
    expect(hasAllScopes(["contacts:read", "deals:read"], ["contacts:read", "deals:read"])).toBe(true);
    expect(hasAllScopes(["contacts:read"], ["contacts:read", "deals:read"])).toBe(false);
  });

  it("empty required list trivially passes", () => {
    expect(hasAllScopes([], [])).toBe(true);
    expect(hasAllScopes(["contacts:read"], [])).toBe(true);
  });
});
