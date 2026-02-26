"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";

const GOAL_TYPES = ["revenue", "deals_won", "deals_created", "contacts_created", "activities_logged"] as const;
const PERIODS = ["monthly", "quarterly", "yearly"] as const;

function getDateRange(period: string): { start: string; end: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  if (period === "monthly") {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return { start: start.toISOString().split("T")[0]!, end: end.toISOString().split("T")[0]! };
  }
  if (period === "quarterly") {
    const qStart = Math.floor(month / 3) * 3;
    const start = new Date(year, qStart, 1);
    const end = new Date(year, qStart + 3, 0);
    return { start: start.toISOString().split("T")[0]!, end: end.toISOString().split("T")[0]! };
  }
  // yearly
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

export function GoalForm({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [type, setType] = useState<string>("revenue");
  const [period, setPeriod] = useState<string>("monthly");
  const [targetValue, setTargetValue] = useState("");
  const [isTeam, setIsTeam] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!targetValue || Number(targetValue) <= 0) {
      toast.error(t("crm.goals.invalidTarget"));
      return;
    }

    const range = getDateRange(period);
    setSaving(true);

    try {
      const res = await fetch("/api/crm/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          target_value: Number(targetValue),
          period,
          start_date: range.start,
          end_date: range.end,
          account_id: isTeam ? null : "self",
        }),
      });
      const json = await res.json();
      if (json.success) {
        onCreated();
      } else {
        toast.error(json.error || t("crm.goals.failedCreate"));
      }
    } catch {
      toast.error(t("crm.goals.failedCreate"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t("crm.goals.new")}</h3>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCancel}>
          <X className="size-4" />
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("crm.goals.goalType")}</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            {GOAL_TYPES.map((gt) => (
              <option key={gt} value={gt}>{t(`crm.goals.types.${gt}`)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("crm.goals.period")}</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            {PERIODS.map((p) => (
              <option key={p} value={p}>{t(`crm.goals.periods.${p}`)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("crm.goals.targetValue")}</label>
          <Input
            type="number"
            min="1"
            placeholder={type === "revenue" ? "100000" : "50"}
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
          />
        </div>

        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isTeam}
              onChange={(e) => setIsTeam(e.target.checked)}
              className="rounded border-input"
            />
            {t("crm.goals.teamGoal")}
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>{t("crm.entityForm.cancel")}</Button>
        <Button size="sm" onClick={handleSubmit} disabled={saving}>
          {saving && <Loader2 className="size-4 animate-spin mr-1.5" />}
          {t("crm.entityForm.create")}
        </Button>
      </div>
    </div>
  );
}
