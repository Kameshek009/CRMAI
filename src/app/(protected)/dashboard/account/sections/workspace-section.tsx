"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { TeamCreateWizard } from "@/components/team/team-create-wizard";
import { useWorkspace } from "@/contexts/team-context";
import { useTranslation } from "@/lib/i18n";
import { ArrowRight, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

function JoinTeamForm({ onJoined }: { onJoined: () => void }) {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<{
    id: string;
    name: string;
    description: string | null;
    memberCount: number;
    maxMembers: number;
  } | null>(null);
  const [validating, setValidating] = useState(false);
  const [joining, setJoining] = useState(false);

  const handleValidate = async () => {
    if (!code.trim()) return;
    setValidating(true);
    setPreview(null);
    try {
      const res = await fetch(`/api/teams/join/validate?code=${encodeURIComponent(code.trim())}`);
      const json = await res.json();
      if (json.success) {
        setPreview(json.data);
      } else {
        toast.error(json.error || t("common.error"));
      }
    } catch {
      toast.error(t("common.error"));
    } finally {
      setValidating(false);
    }
  };

  const handleJoin = async () => {
    setJoining(true);
    try {
      const res = await fetch("/api/teams/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: code.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(t("settings.workspace.joined", { name: json.data.teamName }));
        onJoined();
      } else {
        toast.error(json.error || t("common.error"));
      }
    } catch {
      toast.error(t("common.error"));
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="invite-code">{t("settings.workspace.inviteCode")}</Label>
        <div className="flex gap-2">
          <Input
            id="invite-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t("settings.workspace.enterCode")}
            onKeyDown={(e) => e.key === "Enter" && handleValidate()}
          />
          <Button onClick={handleValidate} disabled={validating || !code.trim()} variant="secondary">
            {validating ? <Loader2 className="size-4 animate-spin" /> : t("common.verify")}
          </Button>
        </div>
      </div>

      {preview && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">{preview.name}</h3>
                {preview.description && (
                  <p className="text-sm text-muted-foreground">{preview.description}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {t("settings.workspace.members", { count: preview.memberCount, max: preview.maxMembers })}
                </p>
              </div>
              <Button onClick={handleJoin} disabled={joining}>
                {joining ? <Loader2 className="size-4 animate-spin mr-2" /> : <ArrowRight className="size-4 mr-2" />}
                {t("common.join")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function WorkspaceSection() {
  const { t } = useTranslation();
  const { currentWorkspace, workspaces, refetch } = useWorkspace();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t("settings.workspace.title")}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {currentWorkspace
            ? t("settings.workspace.current", { name: currentWorkspace.name })
            : t("settings.workspace.none")}
          {workspaces.length > 1 && ` ${t("settings.workspace.total", { count: workspaces.length })}`}
        </p>
      </div>
      <Separator />
      <Tabs defaultValue="join" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="join" className="gap-2">
            <ArrowRight className="size-4" />
            {t("settings.workspace.joinWorkspace")}
          </TabsTrigger>
          <TabsTrigger value="create" className="gap-2">
            <Plus className="size-4" />
            {t("settings.workspace.createWorkspace")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="join" className="mt-4">
          <JoinTeamForm onJoined={refetch} />
        </TabsContent>
        <TabsContent value="create" className="mt-4">
          <TeamCreateWizard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
