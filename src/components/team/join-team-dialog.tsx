"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useWorkspace } from "@/contexts/team-context";
import { useTranslation } from "@/lib/i18n";
import { ArrowRight, Loader2 } from "lucide-react";

interface JoinTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoined?: () => void;
}

export function JoinTeamDialog({ open, onOpenChange, onJoined }: JoinTeamDialogProps) {
  const { t } = useTranslation();
  const { refetch } = useWorkspace();
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

  const resetForm = () => {
    setCode("");
    setPreview(null);
    setValidating(false);
    setJoining(false);
  };

  const handleOpenChange = (value: boolean) => {
    if (!value) resetForm();
    onOpenChange(value);
  };

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
        await refetch();
        onJoined?.();
        handleOpenChange(false);
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("settings.workspace.joinWorkspace")}</DialogTitle>
          <DialogDescription>
            {t("settings.workspace.enterCode")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="join-invite-code">{t("settings.workspace.inviteCode")}</Label>
            <div className="flex gap-2">
              <Input
                id="join-invite-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="XXXX-XXXX"
                onKeyDown={(e) => e.key === "Enter" && handleValidate()}
                autoFocus
              />
              <Button onClick={handleValidate} disabled={validating || !code.trim()} variant="secondary">
                {validating ? <Loader2 className="size-4 animate-spin" /> : t("common.verify")}
              </Button>
            </div>
          </div>

          {preview && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-lg truncate">{preview.name}</h3>
                    {preview.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{preview.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("settings.workspace.members", { count: preview.memberCount, max: preview.maxMembers })}
                    </p>
                  </div>
                  <Button onClick={handleJoin} disabled={joining} className="shrink-0">
                    {joining ? <Loader2 className="size-4 animate-spin mr-2" /> : <ArrowRight className="size-4 mr-2" />}
                    {t("common.join")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
