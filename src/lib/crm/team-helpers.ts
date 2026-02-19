import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { WorkspaceContext, WorkspacePermissions, WorkspaceRoleRow, FixedRole } from "@/types/team";
import { FIXED_ROLE_PERMISSIONS, tierUsesFixedRoles } from "@/types/team";
import { logger } from "@/lib/logger";

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
  // NOTE: Using .limit(1) instead of .single() for team_members — .single()
  // throws on 0 rows AND >1 rows, making debugging impossible.
  const [workspaceResult, membersResult] = await Promise.all([
    supabase
      .from("teams")
      .select("*")
      .eq("id", account.current_team_id)
      .single(),
    supabase
      .from("team_members")
      .select("*, team_roles(*)")
      .eq("team_id", account.current_team_id)
      .eq("account_id", account.id)
      .eq("status", "active")
      .limit(1),
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

  let member = membersResult.data?.[0] ?? null;

  if (membersResult.error) {
    logger.error("WorkspaceContext", `Member query error for account=${account.id} team=${account.current_team_id}`, {
      error: membersResult.error.message,
      code: membersResult.error.code,
      hint: membersResult.error.hint,
    });
  }

  if (!member) {
    // No active membership found — try self-repair for team owner
    const isTeamOwner = workspace.owner_account_id === account.id;

    logger.error("WorkspaceContext", `No active membership: account=${account.id} team=${account.current_team_id} isOwner=${isTeamOwner}`);

    if (isTeamOwner) {
      // Check if inactive membership exists
      const { data: anyMembers } = await supabase
        .from("team_members")
        .select("id, status, role_id")
        .eq("team_id", account.current_team_id)
        .eq("account_id", account.id)
        .limit(1);

      if (anyMembers && anyMembers.length > 0) {
        // Reactivate existing membership
        await supabase
          .from("team_members")
          .update({ status: "active" })
          .eq("id", anyMembers[0].id);
        logger.info("WorkspaceContext", `Self-repair: reactivated membership ${anyMembers[0].id}`);
      } else {
        // Recreate owner membership — find Owner role
        const { data: ownerRoles } = await supabase
          .from("team_roles")
          .select("id")
          .eq("team_id", account.current_team_id)
          .eq("name", "Owner")
          .limit(1);

        if (ownerRoles && ownerRoles.length > 0) {
          // Insert without fixed_role first (column may not exist if migration 022 wasn't applied)
          const insertData: Record<string, unknown> = {
            team_id: account.current_team_id,
            account_id: account.id,
            role_id: ownerRoles[0].id,
            is_director: true,
            status: "active",
          };
          const { error: insertErr } = await supabase.from("team_members").insert(insertData);
          if (insertErr) {
            logger.error("WorkspaceContext", "Self-repair insert failed", insertErr);
          } else {
            logger.info("WorkspaceContext", `Self-repair: recreated owner membership for team ${account.current_team_id}`);
          }
        }
      }

      // Retry after self-repair
      const { data: repairedMembers } = await supabase
        .from("team_members")
        .select("*, team_roles(*)")
        .eq("team_id", account.current_team_id)
        .eq("account_id", account.id)
        .eq("status", "active")
        .limit(1);

      member = repairedMembers?.[0] ?? null;

      if (member) {
        logger.info("WorkspaceContext", "Self-repair successful");
      } else {
        logger.error("WorkspaceContext", "Self-repair failed — still no active membership");
        return {
          context: null,
          error: NextResponse.json(
            { success: false, error: "Not a member of current workspace" },
            { status: 403 }
          ),
        };
      }
    } else {
      return {
        context: null,
        error: NextResponse.json(
          { success: false, error: "Not a member of current workspace" },
          { status: 403 }
        ),
      };
    }
  }

  const role = member.team_roles as unknown as WorkspaceRoleRow;
  const fixedRole = (member.fixed_role || (member.is_director ? "owner" : "member")) as FixedRole;
  const tier = (workspace.tier as string) || "free";

  // For Free/Pro: use fixed role permissions; for Max/Enterprise: use custom role permissions
  const permissions = tierUsesFixedRoles(tier)
    ? FIXED_ROLE_PERMISSIONS[fixedRole]
    : role.permissions;

  // Load visibility group IDs for this user (fire-and-forget safe)
  let visibilityGroupIds: string[] = [];
  try {
    const { data: vgMembers } = await supabase
      .from("visibility_group_members")
      .select("group_id, visibility_groups!inner(team_id)")
      .eq("account_id", account.id)
      .eq("visibility_groups.team_id", account.current_team_id);
    visibilityGroupIds = (vgMembers || []).map((m: { group_id: string }) => m.group_id);
  } catch {
    // Table may not exist yet — gracefully degrade
  }

  return {
    context: {
      accountId: account.id,
      workspaceId: account.current_team_id,
      teamId: account.current_team_id, // backward compat
      memberId: member.id,
      tier: tier as import("@/types").SubscriptionTier,
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
      visibilityGroupIds,
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
