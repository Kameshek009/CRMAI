"use client";

import { useState, useEffect, useCallback } from "react";
import { useTeam } from "@/contexts/team-context";
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
import { toast } from "sonner";

interface AiPerms {
  permission_level: number;
  can_create_contacts: boolean;
  can_create_deals: boolean;
  can_create_tasks: boolean;
  max_task_priority: number;
}

export default function TeamSettingsPage() {
  const { currentTeam, isDirector, refetch } = useTeam();
  const router = useRouter();
  const [name, setName] = useState(currentTeam?.name || "");
  const [description, setDescription] = useState(currentTeam?.description || "");
  const [saving, setSaving] = useState(false);
  const [aiPerms, setAiPerms] = useState<AiPerms | null>(null);
  const [savingAi, setSavingAi] = useState(false);

  const fetchAiPerms = useCallback(async () => {
    if (!currentTeam) return;
    const res = await fetch(`/api/teams/${currentTeam.id}/ai-permissions`);
    const json = await res.json();
    if (json.success) setAiPerms(json.data);
  }, [currentTeam]);

  useEffect(() => {
    fetchAiPerms();
  }, [fetchAiPerms]);

  const handleSaveInfo = async () => {
    if (!currentTeam) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/teams/${currentTeam.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Team updated");
        refetch();
      } else {
        toast.error(json.error || "Failed");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAi = async () => {
    if (!currentTeam || !aiPerms) return;
    setSavingAi(true);
    try {
      const res = await fetch(`/api/teams/${currentTeam.id}/ai-permissions`, {
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

  const handleDeleteTeam = async () => {
    if (!currentTeam) return;
    if (!confirm("Are you sure? This will permanently delete the team and all its data.")) return;

    const res = await fetch(`/api/teams/${currentTeam.id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      toast.success("Team deleted");
      router.push("/join-team");
    } else {
      toast.error(json.error || "Failed to delete");
    }
  };

  if (!isDirector) {
    return (
      <PageContainer>
        <PageHeader title="Settings" description="Only directors can manage team settings." />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader title="Team Settings" description="Manage your team configuration" />

      <div className="space-y-6 max-w-2xl">
        {/* Team Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Team Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Team Name</Label>
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
              <CardDescription>Control what the AI agent can do in your team</CardDescription>
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
              <div className="space-y-3">
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

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <Separator className="mb-4" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Delete Team</p>
                <p className="text-xs text-muted-foreground">Permanently delete this team and all its data.</p>
              </div>
              <Button variant="destructive" size="sm" onClick={handleDeleteTeam}>
                Delete Team
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
