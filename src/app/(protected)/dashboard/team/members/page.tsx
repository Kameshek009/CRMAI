"use client";

import { useState, useEffect, useCallback } from "react";
import { useTeam } from "@/contexts/team-context";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RoleBadge } from "@/components/team/role-badge";
import { KickMemberDialog } from "@/components/team/kick-member-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { UserMinus, Crown, Users } from "lucide-react";
import { toast } from "sonner";

interface MemberData {
  id: string;
  is_director: boolean;
  joined_at: string;
  team_roles: { id: string; name: string; color: string; priority: number };
  accounts: { id: string; name?: string; email?: string };
}

export default function TeamMembersPage() {
  const { currentTeam, can } = useTeam();
  const [members, setMembers] = useState<MemberData[]>([]);
  const [roles, setRoles] = useState<{ id: string; name: string; color: string }[]>([]);
  const [kickTarget, setKickTarget] = useState<{ id: string; name: string } | null>(null);
  const [kicking, setKicking] = useState(false);

  const fetchMembers = useCallback(async () => {
    if (!currentTeam) return;
    const res = await fetch(`/api/teams/${currentTeam.id}/members`);
    const json = await res.json();
    if (json.success) setMembers(json.data || []);
  }, [currentTeam]);

  const fetchRoles = useCallback(async () => {
    if (!currentTeam) return;
    const res = await fetch(`/api/teams/${currentTeam.id}/roles`);
    const json = await res.json();
    if (json.success) setRoles(json.data || []);
  }, [currentTeam]);

  useEffect(() => {
    fetchMembers();
    fetchRoles();
  }, [fetchMembers, fetchRoles]);

  const handleKick = async () => {
    if (!kickTarget || !currentTeam) return;
    setKicking(true);
    try {
      const res = await fetch(`/api/teams/${currentTeam.id}/members/kick`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: kickTarget.id }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Removed ${kickTarget.name}`);
        fetchMembers();
      } else {
        toast.error(json.error || "Failed to remove");
      }
    } catch {
      toast.error("Failed to remove member");
    } finally {
      setKicking(false);
      setKickTarget(null);
    }
  };

  const handleRoleChange = async (memberId: string, roleId: string) => {
    if (!currentTeam) return;
    const res = await fetch(`/api/teams/${currentTeam.id}/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role_id: roleId }),
    });
    const json = await res.json();
    if (json.success) {
      toast.success("Role updated");
      fetchMembers();
    } else {
      toast.error(json.error || "Failed to update");
    }
  };

  const getMemberName = (m: MemberData) => {
    if (m.accounts?.name) {
      return m.accounts.name;
    }
    return m.accounts?.email || "Unknown";
  };

  const maxMembers = currentTeam?.maxMembers || 0;
  const capacityPercent = maxMembers > 0 ? Math.round((members.length / maxMembers) * 100) : 0;
  const isNearFull = capacityPercent >= 80;

  return (
    <PageContainer>
      <PageHeader title="Members" description={`${members.length} team members`}>
        <Badge variant="outline" className="gap-1.5">
          <Users className="size-3" />
          {members.length} / {maxMembers > 1000 ? "∞" : maxMembers}
        </Badge>
      </PageHeader>

      {/* Capacity indicator */}
      {maxMembers <= 1000 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Team capacity</span>
            <span className={isNearFull ? "text-amber-500 font-medium" : ""}>
              {capacityPercent}%
            </span>
          </div>
          <Progress value={capacityPercent} className="h-1.5" />
        </div>
      )}

      <div className="space-y-2">
        {members.map((member) => (
          <Card key={member.id}>
            <CardContent className="flex items-center gap-4 py-3">
              <Avatar className="size-10">
                <AvatarFallback>
                  {getMemberName(member).slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">
                    {getMemberName(member)}
                  </span>
                  {member.is_director && <Crown className="size-3.5 text-amber-500" />}
                </div>
                <span className="text-xs text-muted-foreground truncate block">
                  {member.accounts?.email || ""}
                </span>
              </div>

              {can("team_settings.manage") && !member.is_director ? (
                <Select
                  value={member.team_roles.id}
                  onValueChange={(val) => handleRoleChange(member.id, val)}
                >
                  <SelectTrigger className="w-32 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <RoleBadge name={member.team_roles.name} color={member.team_roles.color} />
              )}

              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {new Date(member.joined_at).toLocaleDateString()}
              </span>

              {can("team_settings.manage") && !member.is_director && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-destructive hover:text-destructive"
                  onClick={() => setKickTarget({ id: member.id, name: getMemberName(member) })}
                >
                  <UserMinus className="size-4" />
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <KickMemberDialog
        open={!!kickTarget}
        onOpenChange={(open) => !open && setKickTarget(null)}
        memberName={kickTarget?.name || ""}
        onConfirm={handleKick}
        isLoading={kicking}
      />
    </PageContainer>
  );
}
