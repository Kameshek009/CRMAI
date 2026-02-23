"use client";

import { useState, useEffect, useCallback } from "react";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "@/lib/i18n";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface NotificationPreferences {
  deal_assigned: boolean;
  task_due: boolean;
  new_team_member: boolean;
  weekly_digest: boolean;
}

const DEFAULT_PREFS: NotificationPreferences = {
  deal_assigned: true,
  task_due: true,
  new_team_member: true,
  weekly_digest: true,
};

const PREF_KEYS: (keyof NotificationPreferences)[] = [
  "deal_assigned",
  "task_due",
  "new_team_member",
  "weekly_digest",
];

const I18N_MAP: Record<keyof NotificationPreferences, { label: string; description: string }> = {
  deal_assigned: { label: "settings.notifications.dealAssigned", description: "settings.notifications.dealAssignedDescription" },
  task_due: { label: "settings.notifications.taskDue", description: "settings.notifications.taskDueDescription" },
  new_team_member: { label: "settings.notifications.newTeamMember", description: "settings.notifications.newTeamMemberDescription" },
  weekly_digest: { label: "settings.notifications.weeklyDigest", description: "settings.notifications.weeklyDigestDescription" },
};

export function NotificationsSection() {
  const { t } = useTranslation();
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/account/notifications")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setPrefs({ ...DEFAULT_PREFS, ...json.data });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = useCallback(async (key: keyof NotificationPreferences, value: boolean) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
    try {
      const res = await fetch("/api/account/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(t("settings.notifications.saved"));
      } else {
        setPrefs((prev) => ({ ...prev, [key]: !value }));
        toast.error(json.error || t("common.failedSave"));
      }
    } catch {
      setPrefs((prev) => ({ ...prev, [key]: !value }));
      toast.error(t("common.failedSave"));
    }
  }, [t]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t("settings.notifications.title")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t("settings.notifications.description")}</p>
      </div>
      <Separator />

      <div className="space-y-4">
        {PREF_KEYS.map((key) => (
          <div key={key} className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">{t(I18N_MAP[key].label)}</p>
              <p className="text-sm text-muted-foreground">{t(I18N_MAP[key].description)}</p>
            </div>
            <Switch
              checked={prefs[key]}
              onCheckedChange={(val) => handleToggle(key, val)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
