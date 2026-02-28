"use client";

import { useState, useEffect, useCallback } from "react";
import { useWorkspace } from "@/contexts/team-context";
import { useTranslation } from "@/lib/i18n";
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
import { Separator } from "@/components/ui/separator";
import { UserMinus, Crown, Users } from "lucide-react";
import { toast } from "sonner";
import {
  FIXED_ROLE_LABELS,
  FIXED_ROLE_COLORS,
  type FixedRole,
} from "@/types/team";

interface MemberData {
  id: string;
  is_director: boolean;
  fixed_role: FixedRole;
  joined_at: string;
  team_roles: { id: string; name: string; color: string; priority: number };
  accounts: { id: string; name?: string; email?: string };
}

export function MembersSection() {
  const { t } = useTranslation();
  const { currentWorkspace, can, usesFixedRoles } = useWorkspace();
  const [members, setMembers] = useState<MemberData[]>([]);
  const [roles, setRoles] = useState<{ id: string; name: string; color: string }[]>([]);
  const [kickTarget, setKickTarget] = useState<{ id: string; name: string } | null>(null);
  const [kicking, setKicking] = useState(false);

  const fetchMembers = useCallback(async () => {
    if (!currentWorkspace) return;
    const res = await fetch(`/api/teams/${currentWorkspace.id}/members`);
    const json = await res.json();
    if (json.success) setMembers(json.data || []);
  }, [currentWorkspace]);

  const fetchRoles = useCallback(async () => {
    if (!currentWorkspace || usesFixedRoles) return;
    const res = await fetch(`/api/teams/${currentWorkspace.id}/roles`);
    const json = await res.json();
    if (json.success) setRoles(json.data || []);
  }, [currentWorkspace, usesFixedRoles]);

  useEffect(() => { fetchMembers(); fetchRoles(); }, [fetchMembers, fetchRoles]);

  const handleKick = async () => {
    if (!kickTarget || !currentWorkspace) return;
    setKicking(true);
    try {
      const res = await fetch(`/api/teams/${currentWorkspace.id}/members/kick`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: kickTarget.id }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(t("team.members.removed", { name: kickTarget.name }));
        fetchMembers();
      } else {
        toast.error(json.error || t("team.members.failedRemove"));
      }
    } catch {
      toast.error(t("team.members.failedRemove"));
    } finally {
      setKicking(false);
      setKickTarget(null);
    }
  };

  const handleFixedRoleChange = async (memberId: string, fixedRole: FixedRole) => {
    if (!currentWorkspace) return;
    try {
      const res = await fetch(`/api/teams/${currentWorkspace.id}/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fixed_role: fixedRole }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(t("team.members.roleUpdated"));
        fetchMembers();
      } else {
        toast.error(json.error || t("team.members.failedUpdate"));
      }
    } catch {
      toast.error(t("common.failed"));
    }
  };

  const handleCustomRoleChange = async (memberId: string, roleId: string) => {
    if (!currentWorkspace) return;
    try {
      const res = await fetch(`/api/teams/${currentWorkspace.id}/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role_id: roleId }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(t("team.members.roleUpdated"));
        fetchMembers();
      } else {
        toast.error(json.error || t("team.members.failedUpdate"));
      }
    } catch {
      toast.error(t("common.failed"));
    }
  };

  const getMemberName = (m: MemberData) => m.accounts?.name || m.accounts?.email || "Unknown";

  const maxMembers = currentWorkspace?.maxMembers || 0;
  const capacityPercent = maxMembers > 0 ? Math.round((members.length / maxMembers) * 100) : 0;
  const isNearFull = capacityPercent >= 80;
  const assignableFixedRoles: FixedRole[] = ["admin", "member", "viewer"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t("team.members.title")}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t("team.members.description", { count: members.length })}</p>
        </div>
        <Badge variant="outline" className="gap-2">
          <Users className="size-3" />
          {members.length} / {maxMembers > 1000 ? "∞" : maxMembers}
        </Badge>
      </div>
      <Separator />

      {maxMembers <= 1000 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t("team.members.capacity")}</span>
            <span className={isNearFull ? "text-amber-500 font-medium" : ""}>{capacityPercent}%</span>
          </div>
          <Progress value={capacityPercent} className="h-1.5" />
        </div>
      )}

      <div className="space-y-2">
        {members.map((member) => (
          <Card key={member.id}>
            <CardContent className="flex items-center gap-4 py-4">
              <Avatar className="size-10">
                <AvatarFallback>{getMemberName(member).slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{getMemberName(member)}</span>
                  {member.is_director && <Crown className="size-3.5 text-amber-500" />}
                </div>
                <span className="text-xs text-muted-foreground truncate block">{member.accounts?.email || ""}</span>
              </div>
              {can("team_settings.manage") && !member.is_director ? (
                usesFixedRoles ? (
                  <Select value={member.fixed_role || "member"} onValueChange={(val) => handleFixedRoleChange(member.id, val as FixedRole)}>
                    <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {assignableFixedRoles.map((r) => (<SelectItem key={r} value={r}>{FIXED_ROLE_LABELS[r]}</SelectItem>))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select value={member.team_roles.id} onValueChange={(val) => handleCustomRoleChange(member.id, val)}>
                    <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {roles.filter((r) => r.name !== "AI").map((r) => (<SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                )
              ) : (
                usesFixedRoles ? (
                  <RoleBadge
                    name={member.is_director ? "Owner" : FIXED_ROLE_LABELS[member.fixed_role || "member"]}
                    color={member.is_director ? FIXED_ROLE_COLORS.owner : FIXED_ROLE_COLORS[member.fixed_role || "member"]}
                  />
                ) : (
                  <RoleBadge name={member.team_roles.name} color={member.team_roles.color} />
                )
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
    </div>
  );
}
