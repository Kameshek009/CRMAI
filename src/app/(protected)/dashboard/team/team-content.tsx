"use client";

import { useTeam } from "@/contexts/team-context";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InviteCodeDisplay } from "@/components/team/invite-code-display";
import { RoleBadge } from "@/components/team/role-badge";
import { Users, Shield, Link2, Kanban } from "lucide-react";
import { useState, useEffect } from "react";

export function TeamContent() {
  const { currentTeam, teams, myRole, isDirector } = useTeam();
  const [inviteCode, setInviteCode] = useState(currentTeam?.inviteCode || "");
  const [memberCount, setMemberCount] = useState<number | null>(null);

  useEffect(() => {
    if (!currentTeam?.id) return;
    fetch(`/api/teams/${currentTeam.id}/members`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setMemberCount(json.data.length);
        }
      })
      .catch(() => {});
  }, [currentTeam?.id]);

  if (!currentTeam) return null;

  const currentMembership = teams.find((t) => t.team.id === currentTeam.id);

  return (
    <PageContainer>
      <PageHeader title={currentTeam.name} description={currentTeam.description || "Team overview"}>
        {myRole && <RoleBadge name={myRole.name} color={myRole.color} />}
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Members</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{memberCount ?? "..."}</div>
            <p className="text-xs text-muted-foreground">Max {currentTeam.maxMembers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Role</CardTitle>
            <Shield className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myRole?.name || "—"}</div>
            <p className="text-xs text-muted-foreground">
              Priority {myRole?.priority || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Teams</CardTitle>
            <Link2 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teams.length}</div>
            <p className="text-xs text-muted-foreground">Joined teams</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Kanban className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentMembership?.isDirector ? "Director" : "Member"}</div>
            <p className="text-xs text-muted-foreground">
              Joined {currentMembership?.joinedAt ? new Date(currentMembership.joinedAt).toLocaleDateString() : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {isDirector && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Invite Code</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Share this code with people you want to invite to your team.
            </p>
            <InviteCodeDisplay
              code={inviteCode || currentTeam.inviteCode}
              teamId={currentTeam.id}
              canRegenerate
              onRegenerate={setInviteCode}
            />
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
