import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { TeamContext, TeamPermissions, TeamRoleRow } from "@/types/team";

type TeamContextResult =
  | { context: TeamContext; error: null }
  | { context: null; error: NextResponse };

// In-memory cache + request deduplication for getTeamContext.
// When 6 API calls fire simultaneously, only the first one runs DB queries;
// the other 5 await the same promise.
const CACHE_TTL = 30_000;
const contextCache = new Map<string, { result: TeamContextResult; ts: number }>();
const inflight = new Map<string, Promise<TeamContextResult>>();

/**
 * Get team context for the currently authenticated user.
 * Uses in-memory cache (30s TTL) and request deduplication.
 */
export async function getTeamContext(): Promise<TeamContextResult> {
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

  const promise = fetchTeamContext(userId);
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

async function fetchTeamContext(userId: string): Promise<TeamContextResult> {
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
        { success: false, error: "No team selected" },
        { status: 400 }
      ),
    };
  }

  // Queries 2 & 3 in parallel: team check + member/role fetch
  const [teamResult, memberResult] = await Promise.all([
    supabase
      .from("teams")
      .select("id, deleted_at")
      .eq("id", account.current_team_id)
      .single(),
    supabase
      .from("team_members")
      .select("id, is_director, status, team_roles(*)")
      .eq("team_id", account.current_team_id)
      .eq("account_id", account.id)
      .eq("status", "active")
      .single(),
  ]);

  const team = teamResult.data;
  if (!team || team.deleted_at) {
    await supabase
      .from("accounts")
      .update({ current_team_id: null })
      .eq("id", account.id);

    return {
      context: null,
      error: NextResponse.json(
        { success: false, error: "No team selected" },
        { status: 400 }
      ),
    };
  }

  const member = memberResult.data;
  if (memberResult.error || !member) {
    return {
      context: null,
      error: NextResponse.json(
        { success: false, error: "Not a member of current team" },
        { status: 403 }
      ),
    };
  }

  const role = member.team_roles as unknown as TeamRoleRow;

  return {
    context: {
      accountId: account.id,
      teamId: account.current_team_id,
      memberId: member.id,
      role: {
        id: role.id,
        teamId: role.team_id,
        name: role.name,
        color: role.color,
        priority: role.priority,
        permissions: role.permissions,
        isSystem: role.is_system,
        createdAt: role.created_at,
        updatedAt: role.updated_at,
      },
      permissions: role.permissions,
      isDirector: member.is_director,
    },
    error: null,
  };
}

/**
 * Check if a user has a specific permission.
 * Directors always have all permissions.
 */
export function hasPermission(
  permissions: TeamPermissions,
  resource: keyof TeamPermissions,
  action: string,
  isDirector?: boolean
): boolean {
  if (isDirector) return true;
  const resourcePerms = permissions[resource];
  if (!resourcePerms) return false;
  return (resourcePerms as Record<string, boolean>)[action] === true;
}

/**
 * Return 403 response if permission is denied, null if allowed.
 * Directors always pass.
 */
export function requirePermission(
  permissions: TeamPermissions,
  resource: keyof TeamPermissions,
  action: string,
  isDirector?: boolean
): NextResponse | null {
  if (!hasPermission(permissions, resource, action, isDirector)) {
    return NextResponse.json(
      { success: false, error: "Permission denied" },
      { status: 403 }
    );
  }
  return null;
}
