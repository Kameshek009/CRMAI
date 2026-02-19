"use client";

import { useState, useEffect, useCallback } from "react";
import { useWorkspace } from "@/contexts/team-context";
import { useRouter } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { FieldManager } from "@/components/crm/field-manager";
import { Eye, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

interface AiPerms {
  permission_level: number;
  can_create_contacts: boolean;
  can_create_deals: boolean;
  can_create_tasks: boolean;
  max_task_priority: number;
}

export default function TeamSettingsPage() {
  const { currentWorkspace, isOwner, refetch } = useWorkspace();
  const router = useRouter();
  const [name, setName] = useState(currentWorkspace?.name || "");
  const [description, setDescription] = useState(currentWorkspace?.description || "");
  const [saving, setSaving] = useState(false);
  const [aiPerms, setAiPerms] = useState<AiPerms | null>(null);
  const [savingAi, setSavingAi] = useState(false);

  const fetchAiPerms = useCallback(async () => {
    if (!currentWorkspace) return;
    const res = await fetch(`/api/teams/${currentWorkspace.id}/ai-permissions`);
    const json = await res.json();
    if (json.success) setAiPerms(json.data);
  }, [currentWorkspace]);

  useEffect(() => {
    fetchAiPerms();
  }, [fetchAiPerms]);

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
        toast.success("Workspace updated");
        refetch();
      } else {
        toast.error(json.error || "Failed");
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
        toast.success("AI permissions updated");
      } else {
        toast.error(json.error || "Failed");
      }
    } finally {
      setSavingAi(false);
    }
  };

  const [deleting, setDeleting] = useState(false);

  const handleDeleteTeam = async () => {
    if (!currentWorkspace) return;
    if (!confirm("Are you sure? You can restore the workspace within 24 hours.")) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/teams/${currentWorkspace.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Workspace deleted. You can restore it within 24 hours.");
        await refetch();
        router.push("/dashboard/team");
      } else {
        toast.error(json.error || "Failed to delete");
      }
    } finally {
      setDeleting(false);
    }
  };

  if (!isOwner) {
    return (
      <PageContainer>
        <PageHeader title="Settings" description="Only workspace owners can manage settings." />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader title="Workspace Settings" description="Manage your workspace configuration" />

      <div className="space-y-6 max-w-2xl">
        {/* Team Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workspace Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Workspace Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={500} />
            </div>
            <Button onClick={handleSaveInfo} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>

        {/* AI Permissions */}
        {aiPerms && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">AI Permissions</CardTitle>
              <CardDescription>Control what the AI agent can do in your workspace</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Permission Level: {aiPerms.permission_level}%</Label>
                <Slider
                  value={[aiPerms.permission_level]}
                  onValueChange={([v]) => setAiPerms({ ...aiPerms, permission_level: v })}
                  max={100}
                  step={5}
                />
              </div>
              <div className="space-y-4">
                <label className="flex items-center justify-between">
                  <span className="text-sm">Can create contacts</span>
                  <Switch
                    checked={aiPerms.can_create_contacts}
                    onCheckedChange={(v) => setAiPerms({ ...aiPerms, can_create_contacts: v })}
                  />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-sm">Can create deals</span>
                  <Switch
                    checked={aiPerms.can_create_deals}
                    onCheckedChange={(v) => setAiPerms({ ...aiPerms, can_create_deals: v })}
                  />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-sm">Can create tasks</span>
                  <Switch
                    checked={aiPerms.can_create_tasks}
                    onCheckedChange={(v) => setAiPerms({ ...aiPerms, can_create_tasks: v })}
                  />
                </label>
              </div>
              <Button onClick={handleSaveAi} disabled={savingAi}>
                {savingAi ? "Saving..." : "Save AI Permissions"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Custom Fields */}
        <FieldManager />

        {/* Visibility Groups */}
        <VisibilityGroupsSection />

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <Separator className="mb-4" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Delete Workspace</p>
                <p className="text-xs text-muted-foreground">Delete this workspace. You can restore it within 24 hours.</p>
              </div>
              <Button variant="destructive" size="sm" onClick={handleDeleteTeam} disabled={deleting}>
                {deleting ? "Deleting..." : "Delete Workspace"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}

// ── Visibility Groups Section ───────────────────────────────────────

interface VGroup {
  id: string;
  name: string;
  is_default: boolean;
  visibility_group_members: { id: string; account_id: string }[];
}

function VisibilityGroupsSection() {
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
        toast.success("Group created");
        setNewName("");
        fetchGroups();
      } else {
        toast.error(json.error || "Failed to create group");
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/crm/visibility-groups/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      toast.success("Group deleted");
      fetchGroups();
    } else {
      toast.error(json.error || "Failed to delete");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Eye className="size-4" />
          Visibility Groups
        </CardTitle>
        <CardDescription>
          Control which records team members can see. Assign records to groups when creating them.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Create new group */}
        <div className="flex items-center gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New group name..."
            className="flex-1"
            maxLength={100}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <Button size="sm" onClick={handleCreate} disabled={isCreating || !newName.trim()}>
            <Plus className="size-3.5 mr-1.5" />
            Add
          </Button>
        </div>

        {/* Groups list */}
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No visibility groups yet. Create one to start restricting record access.
          </p>
        ) : (
          <div className="space-y-2">
            {groups.map((group) => (
              <div
                key={group.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-md bg-secondary">
                    <Users className="size-3.5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{group.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {group.visibility_group_members?.length || 0} members
                    </p>
                  </div>
                  {group.is_default && (
                    <Badge variant="secondary" className="text-[10px]">Default</Badge>
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
