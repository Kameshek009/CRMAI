"use client";

import { useState, useEffect, useCallback } from "react";
import { useWorkspace } from "@/contexts/team-context";
import { useTranslation } from "@/lib/i18n";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface DaySchedule {
  day_of_week: number;
  is_working: boolean;
  start_time: string;
  end_time: string;
}

const DEFAULT_DAYS: DaySchedule[] = [
  { day_of_week: 0, is_working: true, start_time: "09:00", end_time: "18:00" },
  { day_of_week: 1, is_working: true, start_time: "09:00", end_time: "18:00" },
  { day_of_week: 2, is_working: true, start_time: "09:00", end_time: "18:00" },
  { day_of_week: 3, is_working: true, start_time: "09:00", end_time: "18:00" },
  { day_of_week: 4, is_working: true, start_time: "09:00", end_time: "18:00" },
  { day_of_week: 5, is_working: false, start_time: "09:00", end_time: "18:00" },
  { day_of_week: 6, is_working: false, start_time: "09:00", end_time: "18:00" },
];

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export function BusinessHoursSection() {
  const { t } = useTranslation();
  const { currentWorkspace, can } = useWorkspace();
  const teamId = currentWorkspace?.id;
  const canManage = can("team_settings.manage");

  const [days, setDays] = useState<DaySchedule[]>(DEFAULT_DAYS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchHours = useCallback(async () => {
    if (!teamId) return;
    try {
      const res = await fetch(`/api/teams/${teamId}/business-hours`);
      const json = await res.json();
      if (json.success && json.data?.length > 0) {
        setDays(json.data.map((d: DaySchedule) => ({
          day_of_week: d.day_of_week,
          is_working: d.is_working,
          start_time: d.start_time?.slice(0, 5) || "09:00",
          end_time: d.end_time?.slice(0, 5) || "18:00",
        })));
      }
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => { fetchHours(); }, [fetchHours]);

  const updateDay = (index: number, updates: Partial<DaySchedule>) => {
    setDays((prev) => prev.map((d, i) => (i === index ? { ...d, ...updates } : d)));
  };

  const handleSave = async () => {
    if (!teamId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/business-hours`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days }),
      });
      const json = await res.json();
      if (json.success) toast.success(t("settings.businessHours.saved"));
      else toast.error(json.error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">{t("settings.businessHours.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("settings.businessHours.description")}</p>
        </div>
        <div className="flex justify-center py-8">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t("settings.businessHours.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("settings.businessHours.description")}</p>
      </div>
      <Separator />

      <div className="space-y-3">
        {days.map((day, idx) => (
          <div key={day.day_of_week} className="flex items-center gap-4 rounded-lg border p-3">
            <div className="w-20 shrink-0">
              <span className="text-sm font-medium">
                {t(`settings.businessHours.days.${DAY_KEYS[idx]}`)}
              </span>
            </div>
            <Switch
              checked={day.is_working}
              onCheckedChange={(v) => updateDay(idx, { is_working: v })}
              disabled={!canManage}
            />
            {day.is_working ? (
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={day.start_time}
                  onChange={(e) => updateDay(idx, { start_time: e.target.value })}
                  disabled={!canManage}
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                />
                <span className="text-sm text-muted-foreground">—</span>
                <input
                  type="time"
                  value={day.end_time}
                  onChange={(e) => updateDay(idx, { end_time: e.target.value })}
                  disabled={!canManage}
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                />
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">
                {t("settings.businessHours.dayOff")}
              </span>
            )}
          </div>
        ))}
      </div>

      {canManage && (
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="size-4 animate-spin mr-1.5" />}
          {t("common.save")}
        </Button>
      )}
    </div>
  );
}
