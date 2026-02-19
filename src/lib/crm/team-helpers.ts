import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { WorkspaceContext, WorkspacePermissions, WorkspaceRoleRow, FixedRole } from "@/types/team";
import { FIXED_ROLE_PERMISSIONS, tierUsesFixedRoles } from "@/types/team";

type WorkspaceContextResult =
  | { context: WorkspaceContext; error: null }
  | { context: null; error: NextResponse };

// In-memory cache + request deduplication for getWorkspaceContext.
// When 6 API calls fire simultaneously, only the first one runs DB queries;
// the other 5 await the same promise.
const CACHE_TTL = 30_000;
const contextCache = new Map<string, { result: WorkspaceContextResult; ts: number }>();
const inflight = new Map<string, Promise<WorkspaceContextResult>>();

/**
 * Get workspace context for the currently authenticated user.
 * Uses in-memory cache (30s TTL) and request deduplication.
 */
export async function getWorkspaceContext(): Promise<WorkspaceContextResult> {
  const { userId } = await auth();

  if (!userId) {
    return {
      context: null,
      error: NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  // Return cached result if fresh
  const cached = contextCache.get(userId);
  if (cached && Date.now() - cached.ts < CACHE_TTL && cached.result.context) {
    return { context: cached.result.context, error: null };
  }

  // Deduplicate: if another request is already fetching, wait for it
  const pending = inflight.get(userId);
  if (pending) return pending;

  const promise = fetchWorkspaceContext(userId);
  inflight.set(userId, promise);

  try {
    const result = await promise;
    if (result.context) {
      contextCache.set(userId, { result, ts: Date.now() });
    }
    return result;
  } finally {
    inflight.delete(userId);
  }
}

/** @deprecated Use getWorkspaceContext */
export const getTeamContext = getWorkspaceContext;

async function fetchWorkspaceContext(userId: string): Promise<WorkspaceContextResult> {
  const supabase = createSupabaseAdmin();

  // Query 1: Get account (must run first — others depend on current_team_id)
  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("id, current_team_id")
    .eq("clerk_user_id", userId)
    .single();

  if (accountError || !account) {
    return {
      context: null,
      error: NextResponse.json(
        { success: false, error: "Account not found" },
        { status: 404 }
      ),
    };
  }

  if (!account.current_team_id) {
    return {
      context: null,
      error: NextResponse.json(
        { success: false, error: "No workspace selected" },
        { status: 400 }
      ),
    };
  }

  // Queries 2 & 3 in parallel: workspace check + member/role fetch
  const [workspaceResult, memberResult] = await Promise.all([
    supabase
      .from("teams")
      .select("id, deleted_at, tier")
      .eq("id", account.current_team_id)
      .single(),
    supabase
      .from("team_members")
      .select("id, is_director, fixed_role, status, team_roles(*)")
      .eq("team_id", account.current_team_id)
      .eq("account_id", account.id)
      .eq("status", "active")
      .single(),
  ]);

  const workspace = workspaceResult.data;
  if (!workspace || workspace.deleted_at) {
    await supabase
      .from("accounts")
      .update({ current_team_id: null })
      .eq("id", account.id);

    return {
      context: null,
      error: NextResponse.json(
        { success: false, error: "No workspace selected" },
        { status: 400 }
      ),
    };
  }

  const member = memberResult.data;
  if (memberResult.error || !member) {
    return {
      context: null,
      error: NextResponse.json(
        { success: false, error: "Not a member of current workspace" },
        { status: 403 }
      ),
    };
  }

  const role = member.team_roles as unknown as WorkspaceRoleRow;
  const fixedRole = (member.fixed_role || (member.is_director ? "owner" : "member")) as FixedRole;
  const tier = (workspace.tier as string) || "free";

  // For Free/Pro: use fixed role permissions; for Max/Enterprise: use custom role permissions
  const permissions = tierUsesFixedRoles(tier)
    ? FIXED_ROLE_PERMISSIONS[fixedRole]
    : role.permissions;

  return {
    context: {
      accountId: account.id,
      workspaceId: account.current_team_id,
      teamId: account.current_team_id, // backward compat
      memberId: member.id,
      fixedRole,
      role: {
        id: role.id,
        workspaceId: role.team_id,
        teamId: role.team_id, // backward compat
        name: role.name,
        color: role.color,
        priority: role.priority,
        permissions: role.permissions,
        isSystem: role.is_system,
        createdAt: role.created_at,
        updatedAt: role.updated_at,
      },
      permissions,
      isOwner: member.is_director,
      isDirector: member.is_director, // backward compat
    },
    error: null,
  };
}

/**
 * Check if a user has a specific permission.
 * Owners always have all permissions.
 */
export function hasPermission(
  permissions: WorkspacePermissions,
  resource: keyof WorkspacePermissions,
  action: string,
  isOwner?: boolean
): boolean {
  if (isOwner) return true;
  const resourcePerms = permissions[resource];
  if (!resourcePerms) return false;
  return (resourcePerms as Record<string, boolean>)[action] === true;
}

/**
 * Return 403 response if permission is denied, null if allowed.
 * Owners always pass.
 */
export function requirePermission(
  permissions: WorkspacePermissions,
  resource: keyof WorkspacePermissions,
  action: string,
  isOwner?: boolean
): NextResponse | null {
  if (!hasPermission(permissions, resource, action, isOwner)) {
    return NextResponse.json(
      { success: false, error: "Permission denied" },
      { status: 403 }
    );
  }
  return null;
}
