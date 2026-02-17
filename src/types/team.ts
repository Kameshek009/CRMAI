// ============================================================================
// Team Types for Nexxus CRM
// ============================================================================

export interface TeamPermissions {
  contacts: { read: boolean; create: boolean; update: boolean; delete: boolean };
  companies: { read: boolean; create: boolean; update: boolean; delete: boolean };
  deals: { read: boolean; create: boolean; update: boolean; delete: boolean };
  tasks: { read: boolean; create: boolean; update: boolean; delete: boolean };
  pipeline: { read: boolean; manage: boolean };
  analytics: { read: boolean };
  team_settings: { read: boolean; manage: boolean };
  ai_chat: { allowed: boolean };
}

export interface Team {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  ownerAccountId: string;
  inviteCode: string;
  maxMembers: number;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface TeamRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  owner_account_id: string;
  invite_code: string;
  max_members: number;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export function transformTeamRow(row: TeamRow): Team {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    ownerAccountId: row.owner_account_id,
    inviteCode: row.invite_code,
    maxMembers: row.max_members,
    settings: row.settings || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface TeamRole {
  id: string;
  teamId: string;
  name: string;
  color: string;
  priority: number;
  permissions: TeamPermissions;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TeamRoleRow {
  id: string;
  team_id: string;
  name: string;
  color: string;
  priority: number;
  permissions: TeamPermissions;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export function transformTeamRoleRow(row: TeamRoleRow): TeamRole {
  return {
    id: row.id,
    teamId: row.team_id,
    name: row.name,
    color: row.color,
    priority: row.priority,
    permissions: row.permissions,
    isSystem: row.is_system,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type TeamMemberStatus = "active" | "invited" | "suspended";

export interface TeamMember {
  id: string;
  teamId: string;
  accountId: string;
  roleId: string;
  isDirector: boolean;
  status: TeamMemberStatus;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  role?: TeamRole;
  account?: { id: string; clerk_user_id: string; name?: string; email?: string };
}

export interface TeamMemberRow {
  id: string;
  team_id: string;
  account_id: string;
  role_id: string;
  is_director: boolean;
  status: TeamMemberStatus;
  joined_at: string;
  created_at: string;
  updated_at: string;
  team_roles?: TeamRoleRow;
}

export type TeamInviteStatus = "pending" | "accepted" | "expired" | "revoked";

export interface TeamInvite {
  id: string;
  teamId: string;
  code: string;
  roleId: string | null;
  invitedEmail: string | null;
  invitedBy: string;
  status: TeamInviteStatus;
  expiresAt: string;
  createdAt: string;
}

export type TeamConnectionStatus = "pending" | "accepted" | "rejected";

export interface TeamConnection {
  id: string;
  requesterTeamId: string;
  targetTeamId: string;
  connectionCode: string | null;
  sharedResources: Record<string, unknown>;
  status: TeamConnectionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AiPermissions {
  id: string;
  teamId: string;
  permissionLevel: number;
  canCreateContacts: boolean;
  canCreateDeals: boolean;
  canCreateTasks: boolean;
  maxTaskPriority: number;
  maxAssignableRolePriority: number;
}

export interface AiPermissionsRow {
  id: string;
  team_id: string;
  permission_level: number;
  can_create_contacts: boolean;
  can_create_deals: boolean;
  can_create_tasks: boolean;
  max_task_priority: number;
  max_assignable_role_priority: number;
}

export interface TeamContext {
  accountId: string;
  teamId: string;
  memberId: string;
  role: TeamRole;
  permissions: TeamPermissions;
  isDirector: boolean;
}
