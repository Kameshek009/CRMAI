"use client";

import { useWorkspace } from "@/contexts/team-context";
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
  const { currentWorkspace, workspaces, deletedWorkspaces, myRole, isOwner, can, refetch, switchWorkspace } = useWorkspace();
  const [inviteCode, setInviteCode] = useState(currentWorkspace?.inviteCode || "");
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    fetch(`/api/teams/${currentWorkspace.id}/members`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setMemberCount(json.data.length);
        }
      })
      .catch(() => {});
  }, [currentWorkspace?.id]);

  const handleRestore = async (wsId: string) => {
    setRestoring(wsId);
    try {
      const res = await fetch(`/api/teams/${wsId}/restore`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        toast.success("Workspace restored!");
        await refetch();
      } else {
        toast.error(json.error || "Failed to restore");
      }
    } finally {
      setRestoring(null);
    }
  };

  // Show restore banner and/or workspace switcher when no current workspace
  if (!currentWorkspace) {
    return (
      <PageContainer>
        <PageHeader title="Workspace" description={deletedWorkspaces.length > 0 ? "Your workspace was deleted" : "No workspace selected"} />
        <div className="space-y-4 max-w-lg">
          {/* Deleted workspaces — restore option */}
          {deletedWorkspaces.map((dw) => {
            const deletedAt = new Date(dw.deletedAt).getTime();
            const expiresAt = deletedAt + 24 * 60 * 60 * 1000;
            const hoursLeft = Math.max(0, Math.ceil((expiresAt - Date.now()) / (1000 * 60 * 60)));
            return (
              <Card key={dw.workspace.id} className="border-warning/50">
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{dw.workspace.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Deleted — restore available for {hoursLeft}h
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRestore(dw.workspace.id)}
                    disabled={restoring === dw.workspace.id}
                  >
                    <Undo2 className="size-3.5 mr-2" />
                    {restoring === dw.workspace.id ? "Restoring..." : "Restore"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
          {/* Other available workspaces — switch */}
          {workspaces.length > 0 && (
            <>
              {deletedWorkspaces.length > 0 && (
                <p className="text-sm text-muted-foreground pt-2">Or switch to an active workspace:</p>
              )}
              {workspaces.map((wm) => (
                <Card key={wm.workspace.id}>
                  <CardContent className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{wm.workspace.name}</p>
                      <p className="text-xs text-muted-foreground">{wm.role.name}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => { switchWorkspace(wm.workspace.id).then(() => refetch()); }}
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

  const currentMembership = workspaces.find((w) => w.workspace.id === currentWorkspace.id);

  return (
    <PageContainer>
      <PageHeader title={currentWorkspace.name} description={currentWorkspace.description || "Workspace overview"}>
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
              {memberCount !== null && currentWorkspace.maxMembers <= 1000 ? (
                <>
                  <Progress value={Math.round((memberCount / currentWorkspace.maxMembers) * 100)} className="h-1.5" />
                  <p className="text-xs text-muted-foreground">{memberCount} / {currentWorkspace.maxMembers} slots</p>
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
              {currentMembership?.isOwner && <Crown className="size-4 text-amber-500" />}
            </div>
            <p className="text-xs text-muted-foreground">
              {currentMembership?.isOwner ? "Owner" : `Priority ${myRole?.priority || 0}`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Workspaces</CardTitle>
            <Link2 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workspaces.length}</div>
            <p className="text-xs text-muted-foreground">Joined workspaces</p>
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
            <p className="text-sm text-muted-foreground mb-4">
              Share this code with people you want to invite to your workspace.
            </p>
            <InviteCodeDisplay
              code={inviteCode || currentWorkspace.inviteCode}
              teamId={currentWorkspace.id}
              canRegenerate
              onRegenerate={setInviteCode}
            />
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
