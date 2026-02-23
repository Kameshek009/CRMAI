import { describe, it, expect } from "vitest";
import { hasPermission, requirePermission } from "@/lib/crm/team-helpers";
import type { WorkspacePermissions } from "@/types/team";

const mockPermissions: WorkspacePermissions = {
  contacts: { create: true, read: true, update: true, delete: false },
  deals: { create: true, read: true, update: false, delete: false },
  team_settings: { read: false, update: false },
} as unknown as WorkspacePermissions;

describe("hasPermission", () => {
  it("returns true when permission is granted", () => {
    expect(hasPermission(mockPermissions, "contacts", "create")).toBe(true);
    expect(hasPermission(mockPermissions, "contacts", "read")).toBe(true);
  });

  it("returns false when permission is denied", () => {
    expect(hasPermission(mockPermissions, "contacts", "delete")).toBe(false);
    expect(hasPermission(mockPermissions, "deals", "update")).toBe(false);
  });

  it("returns false for unknown resource", () => {
    expect(hasPermission(mockPermissions, "nonexistent" as keyof WorkspacePermissions, "read")).toBe(false);
  });

  it("returns true for owners regardless of permissions", () => {
    expect(hasPermission(mockPermissions, "contacts", "delete", true)).toBe(true);
    expect(hasPermission(mockPermissions, "team_settings", "update", true)).toBe(true);
  });

  it("returns false for non-owners without permission", () => {
    expect(hasPermission(mockPermissions, "team_settings", "update", false)).toBe(false);
  });
});

describe("requirePermission", () => {
  it("returns null when allowed", () => {
    expect(requirePermission(mockPermissions, "contacts", "create")).toBeNull();
  });

  it("returns 403 response when denied", () => {
    const result = requirePermission(mockPermissions, "contacts", "delete");
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it("returns null for owners even if permission is denied", () => {
    expect(requirePermission(mockPermissions, "contacts", "delete", true)).toBeNull();
  });
});
