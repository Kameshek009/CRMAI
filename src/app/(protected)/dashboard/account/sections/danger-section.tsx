"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "@/lib/i18n";
import { useWorkspace } from "@/contexts/team-context";
import { toast } from "sonner";

export function DangerSection() {
  const { t } = useTranslation();
  const { currentWorkspace, isOwner, refetch } = useWorkspace();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDeleteWorkspace = async () => {
    if (!currentWorkspace) return;
    if (!confirm(t("settings.danger.confirmDeleteWorkspace"))) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/teams/${currentWorkspace.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success(t("settings.danger.workspaceDeleted"));
        await refetch();
      } else {
        toast.error(json.error || t("common.error"));
      }
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
            <Button variant="destructive" onClick={handleDeleteWorkspace} disabled={deleting}>
              {deleting ? t("settings.danger.deleting") : t("settings.danger.deleteWorkspace")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
