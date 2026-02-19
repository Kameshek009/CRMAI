"use client";

import { useState, useEffect, useCallback } from "react";
import { useWorkspace } from "@/contexts/team-context";
import { useTranslation } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { InviteCodeDisplay } from "@/components/team/invite-code-display";
import { RoleBadge } from "@/components/team/role-badge";
import { FieldManager } from "@/components/crm/field-manager";
import { Users, Shield, Link2, Crown, Eye, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface AiPerms {
  permission_level: number;
  can_create_contacts: boolean;
  can_create_deals: boolean;
  can_create_tasks: boolean;
  max_task_priority: number;
}

interface VGroup {
  id: string;
  name: string;
  is_default: boolean;
  visibility_group_members: { id: string; account_id: string }[];
}

function VisibilityGroupsSection() {
  const { t } = useTranslation();
  const [groups, setGroups] = useState<VGroup[]>([]);
  const [newName, setNewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const fetchGroups = useCallback(async () => {
    const res = await fetch("/api/crm/visibility-groups");
    const json = await res.json();
    if (json.success) setGroups(json.data || []);
  }, []);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setIsCreating(true);
    try {
      const res = await fetch("/api/crm/visibility-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(t("team.visibilityGroups.created"));
        setNewName("");
        fetchGroups();
      } else {
        toast.error(json.error || t("team.visibilityGroups.failedCreate"));
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/crm/visibility-groups/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      toast.success(t("team.visibilityGroups.deleted"));
      fetchGroups();
    } else {
      toast.error(json.error || t("team.visibilityGroups.failedDelete"));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Eye className="size-4" />
          {t("team.visibilityGroups.title")}
        </CardTitle>
        <CardDescription>{t("team.visibilityGroups.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t("team.visibilityGroups.newGroupPlaceholder")}
            className="flex-1"
            maxLength={100}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <Button size="sm" onClick={handleCreate} disabled={isCreating || !newName.trim()}>
            <Plus className="size-3.5 mr-1.5" />
            {t("common.add")}
          </Button>
        </div>
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {t("team.visibilityGroups.noGroups")}
          </p>
        ) : (
          <div className="space-y-2">
            {groups.map((group) => (
              <div key={group.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-md bg-secondary">
                    <Users className="size-3.5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{group.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("team.visibilityGroups.members", { count: group.visibility_group_members?.length || 0 })}
                    </p>
                  </div>
                  {group.is_default && (
                    <Badge variant="secondary" className="text-[10px]">{t("team.visibilityGroups.default")}</Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(group.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function TeamSection() {
  const { t } = useTranslation();
  const { currentWorkspace, workspaces, myRole, isOwner, can, refetch } = useWorkspace();
  const [name, setName] = useState(currentWorkspace?.name || "");
  const [description, setDescription] = useState(currentWorkspace?.description || "");
  const [saving, setSaving] = useState(false);
  const [aiPerms, setAiPerms] = useState<AiPerms | null>(null);
  const [savingAi, setSavingAi] = useState(false);
  const [inviteCode, setInviteCode] = useState(currentWorkspace?.inviteCode || "");
  const [memberCount, setMemberCount] = useState<number | null>(null);

  const fetchAiPerms = useCallback(async () => {
    if (!currentWorkspace) return;
    const res = await fetch(`/api/teams/${currentWorkspace.id}/ai-permissions`);
    const json = await res.json();
    if (json.success) setAiPerms(json.data);
  }, [currentWorkspace]);

  useEffect(() => { fetchAiPerms(); }, [fetchAiPerms]);

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    fetch(`/api/teams/${currentWorkspace.id}/members`)
      .then((res) => res.json())
      .then((json) => { if (json.success && json.data) setMemberCount(json.data.length); })
      .catch(() => {});
  }, [currentWorkspace?.id]);

  const handleSaveInfo = async () => {
    if (!currentWorkspace) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/teams/${currentWorkspace.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(t("team.settings.info.updated"));
        refetch();
      } else {
        toast.error(json.error || t("common.failed"));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAi = async () => {
    if (!currentWorkspace || !aiPerms) return;
    setSavingAi(true);
    try {
      const res = await fetch(`/api/teams/${currentWorkspace.id}/ai-permissions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(aiPerms),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(t("team.settings.ai.aiUpdated"));
      } else {
        toast.error(json.error || t("common.failed"));
      }
    } finally {
      setSavingAi(false);
    }
  };

  if (!currentWorkspace) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">{t("team.overview.title")}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t("team.overview.noWorkspace")}</p>
        </div>
      </div>
    );
  }

  const currentMembership = workspaces.find((w) => w.workspace.id === currentWorkspace.id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t("team.overview.title")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{currentWorkspace.description || t("team.overview.workspaceOverview")}</p>
      </div>
      <Separator />

      {/* Overview cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("team.overview.members")}</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{memberCount ?? "..."}</div>
            {memberCount !== null && currentWorkspace.maxMembers <= 1000 ? (
              <div className="mt-2 space-y-1">
                <Progress value={Math.round((memberCount / currentWorkspace.maxMembers) * 100)} className="h-1.5" />
                <p className="text-xs text-muted-foreground">{t("team.overview.slots", { count: memberCount, max: currentWorkspace.maxMembers })}</p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{t("team.overview.unlimited")}</p>
            )}
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
      </div>

      {/* Invite Code */}
      {can("team_settings.manage") && (
        <>
          <Separator />
          <div>
            <h3 className="text-sm font-semibold mb-2">{t("team.overview.inviteCode")}</h3>
            <p className="text-sm text-muted-foreground mb-4">{t("team.overview.inviteCodeDescription")}</p>
            <InviteCodeDisplay
              code={inviteCode || currentWorkspace.inviteCode}
              teamId={currentWorkspace.id}
              canRegenerate
              onRegenerate={setInviteCode}
            />
          </div>
        </>
      )}

      {/* Workspace Settings (owner only) */}
      {isOwner && (
        <>
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("team.settings.info.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t("team.settings.info.name")}</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
              </div>
              <div className="space-y-2">
                <Label>{t("team.settings.info.description")}</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={500} />
              </div>
              <Button onClick={handleSaveInfo} disabled={saving}>
                {saving ? t("common.saving") : t("common.saveChanges")}
              </Button>
            </CardContent>
          </Card>

          {/* AI Permissions */}
          {aiPerms && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("team.settings.ai.title")}</CardTitle>
                <CardDescription>{t("team.settings.ai.description")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("team.settings.ai.permissionLevel", { value: aiPerms.permission_level })}</Label>
                  <Slider
                    value={[aiPerms.permission_level]}
                    onValueChange={([v]) => setAiPerms({ ...aiPerms, permission_level: v })}
                    max={100}
                    step={5}
                  />
                </div>
                <div className="space-y-4">
                  <label className="flex items-center justify-between">
                    <span className="text-sm">{t("team.settings.ai.canCreateContacts")}</span>
                    <Switch checked={aiPerms.can_create_contacts} onCheckedChange={(v) => setAiPerms({ ...aiPerms, can_create_contacts: v })} />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-sm">{t("team.settings.ai.canCreateDeals")}</span>
                    <Switch checked={aiPerms.can_create_deals} onCheckedChange={(v) => setAiPerms({ ...aiPerms, can_create_deals: v })} />
                  </label>
                  <label className="flex items-center justify-between">
                    <span className="text-sm">{t("team.settings.ai.canCreateTasks")}</span>
                    <Switch checked={aiPerms.can_create_tasks} onCheckedChange={(v) => setAiPerms({ ...aiPerms, can_create_tasks: v })} />
                  </label>
                </div>
                <Button onClick={handleSaveAi} disabled={savingAi}>
                  {savingAi ? t("common.saving") : t("team.settings.ai.saveAi")}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Custom Fields */}
          <FieldManager />

          {/* Visibility Groups */}
          <VisibilityGroupsSection />
        </>
      )}
    </div>
  );
}
