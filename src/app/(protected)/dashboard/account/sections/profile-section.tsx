"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Check, Loader2, Pencil } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { toast } from "sonner";

interface ProfileSectionProps {
  email: string;
  name: string;
  imageUrl: string;
}

export function ProfileSection({ email, name: initialName, imageUrl }: ProfileSectionProps) {
  const { t } = useTranslation();
  const [displayName, setDisplayName] = useState(initialName);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(initialName);
  const [savingName, setSavingName] = useState(false);

  const initials = displayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === displayName) {
      setEditingName(false);
      setNameInput(displayName);
      return;
    }
    setSavingName(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const json = await res.json();
      if (json.success) {
        setDisplayName(trimmed);
        setEditingName(false);
        toast.success(t("settings.profile.nameUpdated"));
      } else {
        toast.error(json.error || t("common.error"));
      }
    } catch {
      toast.error(t("common.error"));
    } finally {
      setSavingName(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t("settings.profile.title")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t("settings.profile.description")}</p>
      </div>
      <Separator />
      <div className="flex items-center gap-4">
        <Avatar className="size-16">
          <AvatarImage src={imageUrl} alt={displayName} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1">
          {editingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveName();
                  if (e.key === "Escape") {
                    setEditingName(false);
                    setNameInput(displayName);
                  }
                }}
                className="h-8 max-w-[240px]"
                autoFocus
                disabled={savingName}
              />
              <Button
                size="sm"
                onClick={handleSaveName}
                disabled={savingName || !nameInput.trim()}
              >
                {savingName ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Check className="size-3.5" />
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditingName(false);
                  setNameInput(displayName);
                }}
                disabled={savingName}
              >
                {t("common.cancel")}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-lg font-medium">{displayName}</p>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => {
                  setNameInput(displayName);
                  setEditingName(true);
                }}
              >
                <Pencil className="size-3.5" />
              </Button>
            </div>
          )}
          <p className="text-sm text-muted-foreground">{email}</p>
        </div>
      </div>
    </div>
  );
}
