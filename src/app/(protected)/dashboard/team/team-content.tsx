"use client";

import { useTeam } from "@/contexts/team-context";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InviteCodeDisplay } from "@/components/team/invite-code-display";
import { RoleBadge } from "@/components/team/role-badge";
import { Progress } from "@/components/ui/progress";
import { Users, Shield, Link2, Crown, Undo2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export function TeamContent() {
  const { currentTeam, teams, deletedTeams, myRole, isDirector, can, refetch, switchTeam } = useTeam();
  const [inviteCode, setInviteCode] = useState(currentTeam?.inviteCode || "");
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);

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

  const handleRestore = async (teamId: string) => {
    setRestoring(teamId);
    try {
      const res = await fetch(`/api/teams/${teamId}/restore`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        toast.success("Team restored!");
        await refetch();
      } else {
        toast.error(json.error || "Failed to restore");
      }
    } finally {
      setRestoring(null);
    }
  };

  // Show restore banner and/or team switcher when no current team
  if (!currentTeam) {
    return (
      <PageContainer>
        <PageHeader title="Team" description={deletedTeams.length > 0 ? "Your team was deleted" : "No team selected"} />
        <div className="space-y-3 max-w-lg">
          {/* Deleted teams — restore option */}
          {deletedTeams.map((dt) => {
            const deletedAt = new Date(dt.deletedAt).getTime();
            const expiresAt = deletedAt + 24 * 60 * 60 * 1000;
            const hoursLeft = Math.max(0, Math.ceil((expiresAt - Date.now()) / (1000 * 60 * 60)));
            return (
              <Card key={dt.team.id} className="border-warning/50">
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{dt.team.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Deleted — restore available for {hoursLeft}h
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRestore(dt.team.id)}
                    disabled={restoring === dt.team.id}
                  >
                    <Undo2 className="size-3.5 mr-1.5" />
                    {restoring === dt.team.id ? "Restoring..." : "Restore"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
          {/* Other available teams — switch */}
          {teams.length > 0 && (
            <>
              {deletedTeams.length > 0 && (
                <p className="text-sm text-muted-foreground pt-2">Or switch to an active team:</p>
              )}
              {teams.map((tm) => (
                <Card key={tm.team.id}>
                  <CardContent className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{tm.team.name}</p>
                      <p className="text-xs text-muted-foreground">{tm.role.name}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => { switchTeam(tm.team.id).then(() => refetch()); }}
                    >
                      Switch
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>
      </PageContainer>
    );
  }

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
            <div className="mt-2 space-y-1">
              {memberCount !== null && currentTeam.maxMembers <= 1000 ? (
                <>
                  <Progress value={Math.round((memberCount / currentTeam.maxMembers) * 100)} className="h-1.5" />
                  <p className="text-xs text-muted-foreground">{memberCount} / {currentTeam.maxMembers} slots</p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Unlimited</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Role</CardTitle>
            <Shield className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{myRole?.name || "—"}</span>
              {currentMembership?.isDirector && <Crown className="size-4 text-amber-500" />}
            </div>
            <p className="text-xs text-muted-foreground">
              {currentMembership?.isDirector ? "Director" : `Priority ${myRole?.priority || 0}`}
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
            <CardTitle className="text-sm font-medium">Joined</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentMembership?.joinedAt ? new Date(currentMembership.joinedAt).toLocaleDateString() : "—"}
            </div>
            <p className="text-xs text-muted-foreground">Member since</p>
          </CardContent>
        </Card>
      </div>

      {can("team_settings.manage") && (
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
