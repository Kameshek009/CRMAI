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
import { useTranslation } from "@/lib/i18n";

export function TeamContent() {
  const { t } = useTranslation();
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
        toast.success(t("team.overview.restored"));
        await refetch();
      } else {
        toast.error(json.error || t("team.overview.failedRestore"));
      }
    } finally {
      setRestoring(null);
    }
  };

  // Show restore banner and/or workspace switcher when no current workspace
  if (!currentWorkspace) {
    return (
      <PageContainer>
        <PageHeader title={t("team.overview.title")} description={deletedWorkspaces.length > 0 ? t("team.overview.deleted") : t("team.overview.noWorkspace")} />
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
                      {t("team.overview.deletedRestore", { hours: hoursLeft })}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRestore(dw.workspace.id)}
                    disabled={restoring === dw.workspace.id}
                  >
                    <Undo2 className="size-3.5 mr-2" />
                    {restoring === dw.workspace.id ? t("team.overview.restoring") : t("team.overview.restore")}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
          {/* Other available workspaces — switch */}
          {workspaces.length > 0 && (
            <>
              {deletedWorkspaces.length > 0 && (
                <p className="text-sm text-muted-foreground pt-2">{t("team.overview.switchPrompt")}</p>
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
                      {t("team.overview.switch")}
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
      <PageHeader title={currentWorkspace.name} description={currentWorkspace.description || t("team.overview.workspaceOverview")}>
        {myRole && <RoleBadge name={myRole.name} color={myRole.color} />}
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("team.overview.members")}</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{memberCount ?? "..."}</div>
            <div className="mt-2 space-y-1">
              {memberCount !== null && currentWorkspace.maxMembers <= 1000 ? (
                <>
                  <Progress value={Math.round((memberCount / currentWorkspace.maxMembers) * 100)} className="h-1.5" />
                  <p className="text-xs text-muted-foreground">{t("team.overview.slots", { count: memberCount, max: currentWorkspace.maxMembers })}</p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">{t("team.overview.unlimited")}</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("team.overview.yourRole")}</CardTitle>
            <Shield className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{myRole?.name || "—"}</span>
              {currentMembership?.isOwner && <Crown className="size-4 text-amber-500" />}
            </div>
            <p className="text-xs text-muted-foreground">
              {currentMembership?.isOwner ? t("team.overview.owner") : t("team.overview.priority", { value: myRole?.priority || 0 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("team.overview.workspaces")}</CardTitle>
            <Link2 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workspaces.length}</div>
            <p className="text-xs text-muted-foreground">{t("team.overview.joinedWorkspaces")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("team.overview.joined")}</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentMembership?.joinedAt ? new Date(currentMembership.joinedAt).toLocaleDateString() : "—"}
            </div>
            <p className="text-xs text-muted-foreground">{t("team.overview.memberSince")}</p>
          </CardContent>
        </Card>
      </div>

      {can("team_settings.manage") && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">{t("team.overview.inviteCode")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {t("team.overview.inviteCodeDescription")}
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
