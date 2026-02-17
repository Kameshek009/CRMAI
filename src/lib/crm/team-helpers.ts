import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { TeamContext, TeamPermissions, TeamRoleRow } from "@/types/team";

/**
 * Get team context for the currently authenticated user.
 * Returns account, team, member info, role, and permissions.
 */
export async function getTeamContext(): Promise<
  | { context: TeamContext; error: null }
  | { context: null; error: NextResponse }
> {
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

  const supabase = createSupabaseAdmin();

  // Get account with current_team_id
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

  // Get team membership with role
  const { data: member, error: memberError } = await supabase
    .from("team_members")
    .select("id, is_director, status, team_roles(*)")
    .eq("team_id", account.current_team_id)
    .eq("account_id", account.id)
    .eq("status", "active")
    .single();

  if (memberError || !member) {
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
