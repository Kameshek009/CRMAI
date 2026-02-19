import { z } from "zod";

export const createTeamSchema = z.object({
  name: z.string().min(1, "Team name is required").max(100),
  description: z.string().max(500).optional(),
  parentTeamId: z.string().uuid().optional().nullable(),
  memberIds: z.array(z.string().uuid()).max(100).optional(),
});

export const updateTeamSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

const permissionObj = z.object({
  read: z.boolean().optional(),
  create: z.boolean().optional(),
  update: z.boolean().optional(),
  delete: z.boolean().optional(),
  manage: z.boolean().optional(),
  allowed: z.boolean().optional(),
}).strict();

export const createRoleSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().optional(),
  priority: z.number().min(1).max(899),
  permissions: z.record(z.string(), permissionObj).optional(),
});

export const updateRoleSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().optional(),
  priority: z.number().min(1).max(899).optional(),
  permissions: z.record(z.string(), permissionObj).optional(),
});

export const joinTeamSchema = z.object({
  invite_code: z.string().min(1, "Invite code is required"),
});

export const kickMemberSchema = z.object({
  member_id: z.string().uuid(),
});

export const updateMemberRoleSchema = z.object({
  role_id: z.string().uuid().optional(),
  fixed_role: z.enum(["admin", "member", "viewer"]).optional(),
});

export const updateAiPermissionsSchema = z.object({
  permission_level: z.number().min(0).max(100).optional(),
  can_create_contacts: z.boolean().optional(),
  can_create_deals: z.boolean().optional(),
  can_create_tasks: z.boolean().optional(),
  max_task_priority: z.number().min(0).max(10).optional(),
  max_assignable_role_priority: z.number().min(0).max(1000).optional(),
});

export const switchTeamSchema = z.object({
  team_id: z.string().uuid(),
});

export const createConnectionSchema = z.object({
  connection_code: z.string().min(1),
});

export const updateConnectionSchema = z.object({
  status: z.enum(["accepted", "rejected"]),
});
