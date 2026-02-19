"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n";
import { useWorkspace } from "@/contexts/team-context";
import { Loader2 } from "lucide-react";

interface TeamCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export function TeamCreateDialog({ open, onOpenChange, onCreated }: TeamCreateDialogProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { workspaces } = useWorkspace();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentTeamId, setParentTeamId] = useState<string | undefined>(undefined);
  const [creating, setCreating] = useState(false);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
      setParentTeamId(undefined);
    }
  }, [open]);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error(t("team.createDialog.nameRequired"));
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          parentTeamId: parentTeamId === "none" ? undefined : parentTeamId || undefined,
        }),
      });
      const json = await res.json();

      if (json.success) {
        toast.success(t("team.createDialog.created"));
        onOpenChange(false);
        onCreated?.();
        router.push("/dashboard");
        router.refresh();
      } else {
        toast.error(json.error || t("team.createDialog.failedCreate"));
      }
    } catch {
      toast.error(t("team.createDialog.failedCreate"));
    } finally {
      setCreating(false);
    }
  };

  // Parent team options — only teams the user owns
  const parentTeamOptions = workspaces
    .filter((w) => w.isOwner)
    .map((w) => ({ id: w.workspace.id, name: w.workspace.name }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("team.createDialog.title")}</DialogTitle>
          <DialogDescription>{t("team.createDialog.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Team name */}
          <div className="space-y-2">
            <Label htmlFor="team-name">{t("team.createDialog.teamName")} *</Label>
            <Input
              id="team-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("team.createDialog.namePlaceholder")}
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="team-desc">{t("team.createDialog.descriptionLabel")}</Label>
            <Textarea
              id="team-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("team.createDialog.descriptionPlaceholder")}
              maxLength={500}
              rows={3}
            />
          </div>

          {/* Parent team */}
          {parentTeamOptions.length > 0 && (
            <div className="space-y-2">
              <Label>{t("team.createDialog.parentTeam")}</Label>
              <Select value={parentTeamId} onValueChange={setParentTeamId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("team.createDialog.parentTeamPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    {t("team.createDialog.noParent")}
                  </SelectItem>
                  {parentTeamOptions.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleCreate} disabled={creating || !name.trim()}>
            {creating ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                {t("team.createDialog.creating")}
              </>
            ) : (
              t("team.createDialog.createTeam")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
