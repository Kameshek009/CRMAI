// ============================================================================
// Workspace Types for Nexxus CRM
// (DB table remains "teams" for backwards compatibility)
// ============================================================================

export interface WorkspacePermissions {
  contacts: { read: boolean; create: boolean; update: boolean; delete: boolean };
  companies: { read: boolean; create: boolean; update: boolean; delete: boolean };
  deals: { read: boolean; create: boolean; update: boolean; delete: boolean };
  tasks: { read: boolean; create: boolean; update: boolean; delete: boolean };
  call_logs: { read: boolean; create: boolean; update: boolean; delete: boolean };
  notes: { read: boolean; create: boolean; update: boolean; delete: boolean };
  leads: { read: boolean; create: boolean; update: boolean; delete: boolean };
  pipeline: { read: boolean; manage: boolean };
  analytics: { read: boolean };
  team_settings: { read: boolean; manage: boolean };
  ai_chat: { allowed: boolean };
}

/** @deprecated Use WorkspacePermissions */
export type TeamPermissions = WorkspacePermissions;

// ============================================================================
// Fixed Roles (used on Free/Pro tiers)
// ============================================================================

export type FixedRole = "owner" | "admin" | "member" | "viewer";

export const FIXED_ROLE_LABELS: Record<FixedRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

export const FIXED_ROLE_COLORS: Record<FixedRole, string> = {
  owner: "#ef4444",
  admin: "#f59e0b",
  member: "#3b82f6",
  viewer: "#6b7280",
};

export const FIXED_ROLE_PRIORITIES: Record<FixedRole, number> = {
  owner: 1000,
  admin: 900,
  member: 500,
  viewer: 100,
};

const ALL_CRUD = { read: true, create: true, update: true, delete: true };
const READ_CREATE_UPDATE = { read: true, create: true, update: true, delete: false };
const READ_ONLY_CRUD = { read: true, create: false, update: false, delete: false };

export const FIXED_ROLE_PERMISSIONS: Record<FixedRole, WorkspacePermissions> = {
  owner: {
    contacts: ALL_CRUD,
    companies: ALL_CRUD,
    deals: ALL_CRUD,
    tasks: ALL_CRUD,
    call_logs: ALL_CRUD,
    notes: ALL_CRUD,
    leads: ALL_CRUD,
    pipeline: { read: true, manage: true },
    analytics: { read: true },
    team_settings: { read: true, manage: true },
    ai_chat: { allowed: true },
  },
  admin: {
    contacts: ALL_CRUD,
    companies: ALL_CRUD,
    deals: ALL_CRUD,
    tasks: ALL_CRUD,
    call_logs: ALL_CRUD,
    notes: ALL_CRUD,
    leads: ALL_CRUD,
    pipeline: { read: true, manage: true },
    analytics: { read: true },
    team_settings: { read: true, manage: false },
    ai_chat: { allowed: true },
  },
  member: {
    contacts: READ_CREATE_UPDATE,
    companies: READ_CREATE_UPDATE,
    deals: READ_CREATE_UPDATE,
    tasks: READ_CREATE_UPDATE,
    call_logs: READ_CREATE_UPDATE,
    notes: READ_CREATE_UPDATE,
    leads: READ_CREATE_UPDATE,
    pipeline: { read: true, manage: false },
    analytics: { read: true },
    team_settings: { read: false, manage: false },
    ai_chat: { allowed: true },
  },
  viewer: {
    contacts: READ_ONLY_CRUD,
    companies: READ_ONLY_CRUD,
    deals: READ_ONLY_CRUD,
    tasks: READ_ONLY_CRUD,
    call_logs: READ_ONLY_CRUD,
    notes: READ_ONLY_CRUD,
    leads: READ_ONLY_CRUD,
    pipeline: { read: true, manage: false },
    analytics: { read: true },
    team_settings: { read: false, manage: false },
    ai_chat: { allowed: false },
  },
};

/** Check if a tier uses fixed roles (Free/Pro) vs custom roles (Max/Enterprise) */
export function tierUsesFixedRoles(tier: string): boolean {
  return tier === "free" || tier === "pro";
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  ownerAccountId: string;
  parentTeamId: string | null;
  inviteCode: string;
  maxMembers: number;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/** @deprecated Use Workspace */
export type Team = Workspace;

export interface WorkspaceRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  owner_account_id: string;
  parent_team_id: string | null;
  invite_code: string;
  max_members: number;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** @deprecated Use WorkspaceRow */
export type TeamRow = WorkspaceRow;

export function transformWorkspaceRow(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    ownerAccountId: row.owner_account_id,
    parentTeamId: row.parent_team_id,
    inviteCode: row.invite_code,
    maxMembers: row.max_members,
    settings: row.settings || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** @deprecated Use transformWorkspaceRow */
export const transformTeamRow = transformWorkspaceRow;

export interface WorkspaceRole {
  id: string;
  workspaceId: string;
  /** @deprecated Use workspaceId */
  teamId: string;
  name: string;
  color: string;
  priority: number;
  permissions: WorkspacePermissions;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

/** @deprecated Use WorkspaceRole */
export type TeamRole = WorkspaceRole;

export interface WorkspaceRoleRow {
  id: string;
  team_id: string;
  name: string;
  color: string;
  priority: number;
  permissions: WorkspacePermissions;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

/** @deprecated Use WorkspaceRoleRow */
export type TeamRoleRow = WorkspaceRoleRow;

export function transformWorkspaceRoleRow(row: WorkspaceRoleRow): WorkspaceRole {
  return {
    id: row.id,
    workspaceId: row.team_id,
    teamId: row.team_id, // backward compat
    name: row.name,
    color: row.color,
    priority: row.priority,
    permissions: row.permissions,
    isSystem: row.is_system,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** @deprecated Use transformWorkspaceRoleRow */
export const transformTeamRoleRow = transformWorkspaceRoleRow;

export type WorkspaceMemberStatus = "active" | "invited" | "suspended";

/** @deprecated Use WorkspaceMemberStatus */
export type TeamMemberStatus = WorkspaceMemberStatus;

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  accountId: string;
  roleId: string;
  fixedRole: FixedRole;
  isOwner: boolean;
  /** @deprecated Use isOwner */
  isDirector: boolean;
  status: WorkspaceMemberStatus;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  role?: WorkspaceRole;
  account?: { id: string; clerk_user_id: string; name?: string; email?: string };
}

/** @deprecated Use WorkspaceMember */
export type TeamMember = WorkspaceMember;

export interface WorkspaceMemberRow {
  id: string;
  team_id: string;
  account_id: string;
  role_id: string;
  fixed_role: FixedRole;
  is_director: boolean;
  status: WorkspaceMemberStatus;
  joined_at: string;
  created_at: string;
  updated_at: string;
  team_roles?: WorkspaceRoleRow;
}

/** @deprecated Use WorkspaceMemberRow */
export type TeamMemberRow = WorkspaceMemberRow;

export type WorkspaceInviteStatus = "pending" | "accepted" | "expired" | "revoked";

/** @deprecated Use WorkspaceInviteStatus */
export type TeamInviteStatus = WorkspaceInviteStatus;

export interface WorkspaceInvite {
  id: string;
  workspaceId: string;
  code: string;
  roleId: string | null;
  invitedEmail: string | null;
  invitedBy: string;
  status: WorkspaceInviteStatus;
  expiresAt: string;
  createdAt: string;
}

/** @deprecated Use WorkspaceInvite */
export type TeamInvite = WorkspaceInvite;

export type WorkspaceConnectionStatus = "pending" | "accepted" | "rejected";

/** @deprecated Use WorkspaceConnectionStatus */
export type TeamConnectionStatus = WorkspaceConnectionStatus;

export interface WorkspaceConnection {
  id: string;
  requesterWorkspaceId: string;
  targetWorkspaceId: string;
  connectionCode: string | null;
  sharedResources: Record<string, unknown>;
  status: WorkspaceConnectionStatus;
  createdAt: string;
  updatedAt: string;
}

/** @deprecated Use WorkspaceConnection */
export type TeamConnection = WorkspaceConnection;

export interface AiPermissions {
  id: string;
  workspaceId: string;
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

export interface WorkspaceContext {
  accountId: string;
  workspaceId: string;
  /** @deprecated Use workspaceId */
  teamId: string;
  memberId: string;
  tier: import("@/types").SubscriptionTier;
  fixedRole: FixedRole;
  role: WorkspaceRole;
  permissions: WorkspacePermissions;
  visibilityGroupIds: string[];
  isOwner: boolean;
  /** @deprecated Use isOwner */
  isDirector: boolean;
}

/** @deprecated Use WorkspaceContext */
export type TeamContext = WorkspaceContext;
