import { describe, it, expect } from "vitest";
import {
  createTeamSchema,
  updateTeamSchema,
  createRoleSchema,
  updateRoleSchema,
  joinTeamSchema,
  kickMemberSchema,
  updateMemberRoleSchema,
  updateAiPermissionsSchema,
  switchTeamSchema,
  createConnectionSchema,
  updateConnectionSchema,
} from "@/lib/crm/team-validation";

describe("team-validation", () => {
  describe("createTeamSchema", () => {
    it("should accept valid team data", () => {
      const result = createTeamSchema.safeParse({
        name: "Test Team",
        description: "A test team",
        parentTeamId: "550e8400-e29b-41d4-a716-446655440000",
        memberIds: ["550e8400-e29b-41d4-a716-446655440001"],
      });
      expect(result.success).toBe(true);
    });

    it("should accept minimal valid data", () => {
      const result = createTeamSchema.safeParse({
        name: "T",
      });
      expect(result.success).toBe(true);
    });

    it("should reject name longer than 100 characters", () => {
      const result = createTeamSchema.safeParse({
        name: "a".repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it("should reject empty name", () => {
      const result = createTeamSchema.safeParse({
        name: "",
      });
      expect(result.success).toBe(false);
    });

    it("should reject description longer than 500 characters", () => {
      const result = createTeamSchema.safeParse({
        name: "Test",
        description: "a".repeat(501),
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid parentTeamId uuid", () => {
      const result = createTeamSchema.safeParse({
        name: "Test",
        parentTeamId: "not-a-uuid",
      });
      expect(result.success).toBe(false);
    });

    it("should reject more than 100 memberIds", () => {
      const memberIds = Array(101).fill("550e8400-e29b-41d4-a716-446655440000");
      const result = createTeamSchema.safeParse({
        name: "Test",
        memberIds,
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing name", () => {
      const result = createTeamSchema.safeParse({
        description: "Test",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateTeamSchema", () => {
    it("should accept valid update data", () => {
      const result = updateTeamSchema.safeParse({
        name: "Updated Team",
        description: "Updated description",
        settings: { theme: "dark" },
        default_currency: "USD",
      });
      expect(result.success).toBe(true);
    });

    it("should accept empty object", () => {
      const result = updateTeamSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("should reject invalid default_currency length", () => {
      const result = updateTeamSchema.safeParse({
        default_currency: "US",
      });
      expect(result.success).toBe(false);
    });

    it("should accept nullable description", () => {
      const result = updateTeamSchema.safeParse({
        description: null,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("createRoleSchema", () => {
    it("should accept valid role data", () => {
      const result = createRoleSchema.safeParse({
        name: "Manager",
        color: "#FF0000",
        priority: 100,
        permissions: {
          contacts: {
            read: true,
            create: true,
            update: true,
            delete: false,
            manage: false,
            allowed: true,
          },
        },
      });
      expect(result.success).toBe(true);
    });

    it("should accept minimal valid role", () => {
      const result = createRoleSchema.safeParse({
        name: "R",
        priority: 1,
      });
      expect(result.success).toBe(true);
    });

    it("should reject name longer than 50 characters", () => {
      const result = createRoleSchema.safeParse({
        name: "a".repeat(51),
        priority: 100,
      });
      expect(result.success).toBe(false);
    });

    it("should reject priority less than 1", () => {
      const result = createRoleSchema.safeParse({
        name: "Role",
        priority: 0,
      });
      expect(result.success).toBe(false);
    });

    it("should reject priority greater than 899", () => {
      const result = createRoleSchema.safeParse({
        name: "Role",
        priority: 900,
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing name", () => {
      const result = createRoleSchema.safeParse({
        priority: 100,
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing priority", () => {
      const result = createRoleSchema.safeParse({
        name: "Role",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateRoleSchema", () => {
    it("should accept valid update data", () => {
      const result = updateRoleSchema.safeParse({
        name: "Updated Role",
        priority: 200,
      });
      expect(result.success).toBe(true);
    });

    it("should accept empty object", () => {
      const result = updateRoleSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe("joinTeamSchema", () => {
    it("should accept valid invite code", () => {
      const result = joinTeamSchema.safeParse({
        invite_code: "ABC123",
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty invite code", () => {
      const result = joinTeamSchema.safeParse({
        invite_code: "",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing invite code", () => {
      const result = joinTeamSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("kickMemberSchema", () => {
    it("should accept valid member_id", () => {
      const result = kickMemberSchema.safeParse({
        member_id: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid uuid", () => {
      const result = kickMemberSchema.safeParse({
        member_id: "not-a-uuid",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing member_id", () => {
      const result = kickMemberSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("updateMemberRoleSchema", () => {
    it("should accept valid role_id", () => {
      const result = updateMemberRoleSchema.safeParse({
        role_id: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.success).toBe(true);
    });

    it("should accept valid fixed_role", () => {
      const result = updateMemberRoleSchema.safeParse({
        fixed_role: "admin",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid fixed_role", () => {
      const result = updateMemberRoleSchema.safeParse({
        fixed_role: "owner",
      });
      expect(result.success).toBe(false);
    });

    it("should accept both role_id and fixed_role", () => {
      const result = updateMemberRoleSchema.safeParse({
        role_id: "550e8400-e29b-41d4-a716-446655440000",
        fixed_role: "member",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("updateAiPermissionsSchema", () => {
    it("should accept valid AI permissions", () => {
      const result = updateAiPermissionsSchema.safeParse({
        permission_level: 50,
        can_create_contacts: true,
        can_create_deals: false,
        can_create_tasks: true,
        max_task_priority: 5,
        max_assignable_role_priority: 500,
      });
      expect(result.success).toBe(true);
    });

    it("should reject permission_level less than 0", () => {
      const result = updateAiPermissionsSchema.safeParse({
        permission_level: -1,
      });
      expect(result.success).toBe(false);
    });

    it("should reject permission_level greater than 100", () => {
      const result = updateAiPermissionsSchema.safeParse({
        permission_level: 101,
      });
      expect(result.success).toBe(false);
    });

    it("should reject max_task_priority greater than 10", () => {
      const result = updateAiPermissionsSchema.safeParse({
        max_task_priority: 11,
      });
      expect(result.success).toBe(false);
    });

    it("should reject max_assignable_role_priority greater than 1000", () => {
      const result = updateAiPermissionsSchema.safeParse({
        max_assignable_role_priority: 1001,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("switchTeamSchema", () => {
    it("should accept valid team_id", () => {
      const result = switchTeamSchema.safeParse({
        team_id: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid uuid", () => {
      const result = switchTeamSchema.safeParse({
        team_id: "not-a-uuid",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing team_id", () => {
      const result = switchTeamSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("createConnectionSchema", () => {
    it("should accept valid connection_code", () => {
      const result = createConnectionSchema.safeParse({
        connection_code: "XYZ789",
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty connection_code", () => {
      const result = createConnectionSchema.safeParse({
        connection_code: "",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing connection_code", () => {
      const result = createConnectionSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("updateConnectionSchema", () => {
    it("should accept status 'accepted'", () => {
      const result = updateConnectionSchema.safeParse({
        status: "accepted",
      });
      expect(result.success).toBe(true);
    });

    it("should accept status 'rejected'", () => {
      const result = updateConnectionSchema.safeParse({
        status: "rejected",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid status", () => {
      const result = updateConnectionSchema.safeParse({
        status: "pending",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing status", () => {
      const result = updateConnectionSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });
});
