"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useTranslation } from "@/lib/i18n";
import { useWorkspace } from "@/contexts/team-context";
import { toast } from "sonner";
import { AlertTriangle, Loader2 } from "lucide-react";

export function DangerSection() {
  const { t } = useTranslation();
  const { currentWorkspace, isOwner, refetch } = useWorkspace();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);

  const workspaceName = currentWorkspace?.name || "";
  const nameMatches = confirmName.trim() === workspaceName;

  const handleDeleteWorkspace = async () => {
    if (!currentWorkspace || !nameMatches) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/teams/${currentWorkspace.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success(t("settings.danger.workspaceDeleted"));
        setDeleteDialogOpen(false);
        setConfirmName("");
        await refetch();
      } else {
        toast.error(json.error || t("common.error"));
      }
    } catch {
      toast.error(t("common.error"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-destructive">{t("settings.danger.title")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t("settings.danger.description")}</p>
      </div>
      <Separator />

      {/* Delete Account */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-sm">{t("settings.danger.deleteAccount")}</p>
          <p className="text-sm text-muted-foreground">
            {t("settings.danger.deleteAccountDescription")}
          </p>
        </div>
        <Button variant="destructive">{t("settings.danger.deleteAccount")}</Button>
      </div>

      {/* Delete Workspace */}
      {currentWorkspace && isOwner && (
        <>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">{t("settings.danger.deleteWorkspace")}</p>
              <p className="text-sm text-muted-foreground">
                {t("settings.danger.deleteWorkspaceDescription")}
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmName("");
                setDeleteDialogOpen(true);
              }}
            >
              {t("settings.danger.deleteWorkspace")}
            </Button>
          </div>

          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="size-5" />
                  {t("settings.danger.confirmTitle")}
                </DialogTitle>
                <DialogDescription>
                  {t("settings.danger.confirmDescription", { name: workspaceName })}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                  {t("settings.danger.confirmWarning")}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-name">
                    {t("settings.danger.confirmLabel", { name: workspaceName })}
                  </Label>
                  <Input
                    id="confirm-name"
                    value={confirmName}
                    onChange={(e) => setConfirmName(e.target.value)}
                    placeholder={workspaceName}
                    autoComplete="off"
                    onKeyDown={(e) => e.key === "Enter" && nameMatches && handleDeleteWorkspace()}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteWorkspace}
                  disabled={!nameMatches || deleting}
                >
                  {deleting ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" />
                      {t("settings.danger.deleting")}
                    </>
                  ) : (
                    t("settings.danger.confirmDelete")
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
