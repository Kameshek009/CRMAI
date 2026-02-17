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
import type { TeamPermissions } from "@/types/team";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface TeamData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  inviteCode: string;
  maxMembers: number;
  ownerAccountId: string;
}

interface TeamMembership {
  team: TeamData;
  role: {
    id: string;
    name: string;
    color: string;
    priority: number;
    permissions: TeamPermissions;
    isSystem: boolean;
  };
  isDirector: boolean;
  memberId: string;
  joinedAt: string;
}

interface TeamContextValue {
  currentTeam: TeamData | null;
  teams: TeamMembership[];
  myRole: TeamMembership["role"] | null;
  permissions: TeamPermissions | null;
  isDirector: boolean;
  memberId: string | null;
  isLoading: boolean;
  error: Error | null;
  switchTeam: (teamId: string) => Promise<void>;
  refetch: () => Promise<void>;
  can: (permission: string) => boolean;
}

const DEFAULT_PERMISSIONS: TeamPermissions = {
  contacts: { read: false, create: false, update: false, delete: false },
  companies: { read: false, create: false, update: false, delete: false },
  deals: { read: false, create: false, update: false, delete: false },
  tasks: { read: false, create: false, update: false, delete: false },
  pipeline: { read: false, manage: false },
  analytics: { read: false },
  team_settings: { read: false, manage: false },
  ai_chat: { allowed: false },
};

const TeamContext = createContext<TeamContextValue | undefined>(undefined);

function transformTeam(raw: Record<string, unknown>): TeamData {
  return {
    id: raw.id as string,
    name: raw.name as string,
    slug: raw.slug as string,
    description: raw.description as string | null,
    inviteCode: raw.invite_code as string,
    maxMembers: raw.max_members as number,
    ownerAccountId: raw.owner_account_id as string,
  };
}

function transformRole(raw: Record<string, unknown>): TeamMembership["role"] {
  return {
    id: raw.id as string,
    name: raw.name as string,
    color: raw.color as string,
    priority: raw.priority as number,
    permissions: raw.permissions as TeamPermissions,
    isSystem: raw.is_system as boolean,
  };
}

interface TeamProviderProps {
  children: ReactNode;
}

export function TeamProvider({ children }: TeamProviderProps) {
  const { account } = useAccount();
  const [currentTeam, setCurrentTeam] = useState<TeamData | null>(null);
  const [teams, setTeams] = useState<TeamMembership[]>([]);
  const [myRole, setMyRole] = useState<TeamMembership["role"] | null>(null);
  const [permissions, setPermissions] = useState<TeamPermissions | null>(null);
  const [isDirector, setIsDirector] = useState(false);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchTeams = useCallback(async () => {
    if (!account?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const res = await fetch("/api/teams/me");
      if (!res.ok) throw new Error("Failed to fetch team data");

      const result = await res.json();
      if (!result.success) throw new Error(result.error || "Failed to fetch teams");

      const { data } = result;

      // Transform teams
      const teamMemberships: TeamMembership[] = (data.teams || []).map(
        (m: { team: Record<string, unknown>; role: Record<string, unknown>; isDirector: boolean; memberId: string; joinedAt: string }) => ({
          team: transformTeam(m.team),
          role: transformRole(m.role),
          isDirector: m.isDirector,
          memberId: m.memberId,
          joinedAt: m.joinedAt,
        })
      );
      setTeams(teamMemberships);

      // Set current team
      if (data.currentTeam) {
        setCurrentTeam(transformTeam(data.currentTeam));
      }
      if (data.currentRole) {
        const role = transformRole(data.currentRole);
        setMyRole(role);
        setPermissions(role.permissions);
      }
      setIsDirector(data.isDirector || false);
      setMemberId(data.memberId || null);
    } catch (err) {
      console.error("[TeamContext] Error loading teams:", err);
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [account?.id]);

  const switchTeam = useCallback(async (teamId: string) => {
    try {
      const res = await fetch("/api/teams/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_id: teamId }),
      });
      if (!res.ok) throw new Error("Failed to switch team");

      // Refetch to update state
      await fetchTeams();
    } catch (err) {
      console.error("[TeamContext] Error switching team:", err);
      throw err;
    }
  }, [fetchTeams]);

  const can = useCallback(
    (permission: string): boolean => {
      // Directors always have all permissions
      if (isDirector) return true;
      if (!permissions) return false;
      // permission format: "resource.action" e.g. "contacts.create", "pipeline.manage"
      const [resource, action] = permission.split(".");
      const resourcePerms = permissions[resource as keyof TeamPermissions];
      if (!resourcePerms) return false;
      return (resourcePerms as Record<string, boolean>)[action] === true;
    },
    [permissions, isDirector]
  );

  // Fetch on mount when account is available
  useEffect(() => {
    if (account?.id) {
      fetchTeams();
    }
  }, [account?.id, fetchTeams]);

  // Subscribe to team_members changes for realtime updates
  useEffect(() => {
    if (!currentTeam?.id) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`team:${currentTeam.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "team_members",
          filter: `team_id=eq.${currentTeam.id}`,
        },
        () => {
          // Refetch on any team_members change
          fetchTeams();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [currentTeam?.id, fetchTeams]);

  const value: TeamContextValue = useMemo(
    () => ({
      currentTeam,
      teams,
      myRole,
      permissions: permissions || DEFAULT_PERMISSIONS,
      isDirector,
      memberId,
      isLoading,
      error,
      switchTeam,
      refetch: fetchTeams,
      can,
    }),
    [currentTeam, teams, myRole, permissions, isDirector, memberId, isLoading, error, switchTeam, fetchTeams, can]
  );

  return (
    <TeamContext.Provider value={value}>{children}</TeamContext.Provider>
  );
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error("useTeam must be used within a TeamProvider");
  }
  return context;
}
