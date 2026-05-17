import { createSupabaseAdmin } from "@/lib/supabase/server";
import type { WorkspaceContext, WorkspacePermissions, WorkspaceRole } from "@/types/team";
import type { SubscriptionTier } from "@/types";
import type { BearerAuthSuccess } from "./bearer-token";

/**
 * Constructs a WorkspaceContext for a request authenticated via API key.
 *
 * The synthesised context carries only the workspace/account/tier — there
 * is no Clerk user, no member row, and no role-based permissions. Routes
 * that accept bearer auth gate access via scopes (checked in
 * verifyBearerToken), not via `context.permissions`; that object is
 * deliberately empty so any accidental permission check denies.
 */
export async function buildApiKeyContext(auth: BearerAuthSuccess): Promise<WorkspaceContext> {
  const supabase = createSupabaseAdmin();
  const { data: account } = await supabase
    .from("accounts")
    .select("tier")
    .eq("id", auth.accountId)
    .single();

  const emptyPerms = {} as WorkspacePermissions;
  const syntheticRole: WorkspaceRole = {
    id: `api_key:${auth.keyId}`,
    workspaceId: auth.teamId,
    teamId: auth.teamId,
    name: "API Key",
    color: "#6b7280",
    priority: 0,
    permissions: emptyPerms,
    isSystem: true,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };

  return {
    accountId: auth.accountId,
    workspaceId: auth.teamId,
    teamId: auth.teamId,
    memberId: `api_key:${auth.keyId}`,
    tier: (account?.tier ?? "free") as SubscriptionTier,
    fixedRole: "member" as WorkspaceContext["fixedRole"],
    role: syntheticRole,
    permissions: emptyPerms,
    visibilityGroupIds: [],
    isOwner: false,
    isDirector: false,
  };
}
