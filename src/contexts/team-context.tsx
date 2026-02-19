"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from "react";
import { useAccount } from "@/contexts/account-context";
import { supabase } from "@/lib/supabase/client";
import type { WorkspacePermissions, FixedRole } from "@/types/team";
import { FIXED_ROLE_PERMISSIONS, tierUsesFixedRoles } from "@/types/team";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface WorkspaceData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  inviteCode: string;
  maxMembers: number;
  ownerAccountId: string;
  parentTeamId: string | null;
  tier: string;
  tokenLimit: number;
  tokensUsed: number;
  weeklyTokensUsed: number;
  seatCount: number;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
}

interface WorkspaceMembership {
  workspace: WorkspaceData;
  role: {
    id: string;
    name: string;
    color: string;
    priority: number;
    permissions: WorkspacePermissions;
    isSystem: boolean;
  };
  fixedRole: FixedRole;
  isOwner: boolean;
  memberId: string;
  joinedAt: string;
}

interface DeletedWorkspaceInfo {
  workspace: WorkspaceData;
  deletedAt: string;
}

interface WorkspaceContextValue {
  currentWorkspace: WorkspaceData | null;
  /** @deprecated Use currentWorkspace */
  currentTeam: WorkspaceData | null;
  workspaces: WorkspaceMembership[];
  /** @deprecated Use workspaces */
  teams: WorkspaceMembership[];
  deletedWorkspaces: DeletedWorkspaceInfo[];
  /** @deprecated Use deletedWorkspaces */
  deletedTeams: DeletedWorkspaceInfo[];
  myRole: WorkspaceMembership["role"] | null;
  fixedRole: FixedRole;
  permissions: WorkspacePermissions;
  isOwner: boolean;
  /** @deprecated Use isOwner */
  isDirector: boolean;
  memberId: string | null;
  isLoading: boolean;
  error: Error | null;
  /** True if current tier uses fixed roles (Free/Pro) */
  usesFixedRoles: boolean;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  /** @deprecated Use switchWorkspace */
  switchTeam: (workspaceId: string) => Promise<void>;
  refetch: () => Promise<void>;
  can: (permission: string) => boolean;
}

// Backward-compat aliases used by existing code
/** @deprecated Use WorkspaceData */
export type TeamData = WorkspaceData;
/** @deprecated Use WorkspaceMembership */
export type TeamMembership = WorkspaceMembership;

const DEFAULT_PERMISSIONS: WorkspacePermissions = {
  contacts: { read: false, create: false, update: false, delete: false },
  companies: { read: false, create: false, update: false, delete: false },
  deals: { read: false, create: false, update: false, delete: false },
  tasks: { read: false, create: false, update: false, delete: false },
  call_logs: { read: false, create: false, update: false, delete: false },
  notes: { read: false, create: false, update: false, delete: false },
  pipeline: { read: false, manage: false },
  analytics: { read: false },
  team_settings: { read: false, manage: false },
  ai_chat: { allowed: false },
};

const WorkspaceCtx = createContext<WorkspaceContextValue | undefined>(undefined);

function transformWorkspace(raw: Record<string, unknown>): WorkspaceData {
  return {
    id: raw.id as string,
    name: raw.name as string,
    slug: raw.slug as string,
    description: raw.description as string | null,
    inviteCode: raw.invite_code as string,
    maxMembers: raw.max_members as number,
    ownerAccountId: raw.owner_account_id as string,
    parentTeamId: (raw.parent_team_id as string) || null,
    tier: (raw.tier as string) || "free",
    tokenLimit: (raw.token_limit as number) || 0,
    tokensUsed: (raw.tokens_used as number) || 0,
    weeklyTokensUsed: (raw.weekly_tokens_used as number) || 0,
    seatCount: (raw.seat_count as number) || 1,
    stripeSubscriptionId: (raw.stripe_subscription_id as string) || null,
    stripeCustomerId: (raw.stripe_customer_id as string) || null,
  };
}

function transformRole(raw: Record<string, unknown>): WorkspaceMembership["role"] {
  return {
    id: raw.id as string,
    name: raw.name as string,
    color: raw.color as string,
    priority: raw.priority as number,
    permissions: raw.permissions as WorkspacePermissions,
    isSystem: raw.is_system as boolean,
  };
}

interface WorkspaceProviderProps {
  children: ReactNode;
}

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const { account } = useAccount();
  const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceData | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceMembership[]>([]);
  const [deletedWorkspaces, setDeletedWorkspaces] = useState<DeletedWorkspaceInfo[]>([]);
  const [myRole, setMyRole] = useState<WorkspaceMembership["role"] | null>(null);
  const [fixedRole, setFixedRole] = useState<FixedRole>("member");
  const [permissions, setPermissions] = useState<WorkspacePermissions>(DEFAULT_PERMISSIONS);
  const [isOwner, setIsOwner] = useState(false);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchWorkspaces = useCallback(async () => {
    if (!account?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const res = await fetch("/api/teams/me");
      if (!res.ok) throw new Error("Failed to fetch workspace data");

      const result = await res.json();
      if (!result.success) throw new Error(result.error || "Failed to fetch workspaces");

      const { data } = result;

      // Transform workspaces (API still returns "teams" key)
      const memberships: WorkspaceMembership[] = (data.teams || []).map(
        (m: { team: Record<string, unknown>; role: Record<string, unknown>; isDirector: boolean; fixedRole?: string; memberId: string; joinedAt: string }) => ({
          workspace: transformWorkspace(m.team),
          role: transformRole(m.role),
          fixedRole: (m.fixedRole || (m.isDirector ? "owner" : "member")) as FixedRole,
          isOwner: m.isDirector,
          memberId: m.memberId,
          joinedAt: m.joinedAt,
        })
      );
      setWorkspaces(memberships);

      // Deleted workspaces that can be restored
      const deleted: DeletedWorkspaceInfo[] = (data.deletedTeams || []).map(
        (d: { team: Record<string, unknown>; deletedAt: string }) => ({
          workspace: transformWorkspace(d.team),
          deletedAt: d.deletedAt,
        })
      );
      setDeletedWorkspaces(deleted);

      // Set current workspace
      if (data.currentTeam) {
        setCurrentWorkspace(transformWorkspace(data.currentTeam));
      }
      const currentFixedRole = (data.fixedRole || (data.isDirector ? "owner" : "member")) as FixedRole;
      setFixedRole(currentFixedRole);

      if (data.currentRole) {
        const role = transformRole(data.currentRole);
        setMyRole(role);

        // For Free/Pro: use fixed role permissions; for Max/Enterprise: use custom role permissions
        const currentTier = (data.currentTeam as Record<string, unknown>)?.tier as string || "free";
        if (tierUsesFixedRoles(currentTier)) {
          setPermissions(FIXED_ROLE_PERMISSIONS[currentFixedRole]);
        } else {
          setPermissions(role.permissions);
        }
      }
      setIsOwner(data.isDirector || false);
      setMemberId(data.memberId || null);
    } catch (err) {
      console.error("[WorkspaceContext] Error loading workspaces:", err);
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [account?.id]);

  const switchWorkspace = useCallback(async (workspaceId: string) => {
    try {
      const res = await fetch("/api/teams/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_id: workspaceId }),
      });
      if (!res.ok) throw new Error("Failed to switch workspace");

      await fetchWorkspaces();
    } catch (err) {
      console.error("[WorkspaceContext] Error switching workspace:", err);
      throw err;
    }
  }, [fetchWorkspaces]);

  const can = useCallback(
    (permission: string): boolean => {
      // Owners always have all permissions
      if (isOwner) return true;
      // permission format: "resource.action" e.g. "contacts.create", "pipeline.manage"
      const [resource, action] = permission.split(".");
      const resourcePerms = permissions[resource as keyof WorkspacePermissions];
      if (!resourcePerms) return false;
      return (resourcePerms as Record<string, boolean>)[action] === true;
    },
    [permissions, isOwner]
  );

  const usesFixedRoles = tierUsesFixedRoles(currentWorkspace?.tier || "free");

  // Fetch on mount when account is available
  useEffect(() => {
    if (account?.id) {
      fetchWorkspaces();
    }
  }, [account?.id, fetchWorkspaces]);

  // Subscribe to team_members changes for realtime updates
  useEffect(() => {
    if (!currentWorkspace?.id) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`workspace:${currentWorkspace.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "team_members",
          filter: `team_id=eq.${currentWorkspace.id}`,
        },
        () => {
          fetchWorkspaces();
        }
      )
      .subscribe((status: string, err?: Error) => {
        if (err) {
          console.error("[WorkspaceContext] Realtime subscription error:", err.message);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [currentWorkspace?.id, fetchWorkspaces]);

  const value: WorkspaceContextValue = useMemo(
    () => ({
      currentWorkspace,
      currentTeam: currentWorkspace, // backward compat
      workspaces,
      teams: workspaces, // backward compat
      deletedWorkspaces,
      deletedTeams: deletedWorkspaces, // backward compat
      myRole,
      fixedRole,
      permissions,
      isOwner,
      isDirector: isOwner, // backward compat
      memberId,
      isLoading,
      error,
      usesFixedRoles,
      switchWorkspace,
      switchTeam: switchWorkspace, // backward compat
      refetch: fetchWorkspaces,
      can,
    }),
    [currentWorkspace, workspaces, deletedWorkspaces, myRole, fixedRole, permissions, isOwner, memberId, isLoading, error, usesFixedRoles, switchWorkspace, fetchWorkspaces, can]
  );

  return (
    <WorkspaceCtx.Provider value={value}>{children}</WorkspaceCtx.Provider>
  );
}

/** Primary hook — use this */
export function useWorkspace() {
  const context = useContext(WorkspaceCtx);
  if (context === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}

/** @deprecated Use useWorkspace */
export const useTeam = useWorkspace;

/** @deprecated Use WorkspaceProvider */
export const TeamProvider = WorkspaceProvider;
