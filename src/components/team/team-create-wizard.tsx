"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n";

export function TeamCreateWizard() {
  const router = useRouter();
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error(t("team.createWizard.nameRequired"));
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
      });
      const json = await res.json();

      if (json.success) {
        toast.success(t("team.createWizard.created"));
        router.push("/dashboard");
        router.refresh();
      } else {
        toast.error(json.error || t("team.createWizard.failedCreate"));
      }
    } catch {
      toast.error(t("team.createWizard.failedCreate"));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="team-name">{t("team.createWizard.teamName")}</Label>
        <Input
          id="team-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("team.createWizard.namePlaceholder")}
          maxLength={100}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="team-desc">{t("team.createWizard.descriptionLabel")}</Label>
        <Textarea
          id="team-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("team.createWizard.descriptionPlaceholder")}
          maxLength={500}
          rows={3}
        />
      </div>
      <Button onClick={handleCreate} disabled={creating || !name.trim()} className="w-full">
        {creating ? t("team.createWizard.creating") : t("team.createWizard.createTeam")}
      </Button>
    </div>
  );
}
