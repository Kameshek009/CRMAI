"use client";

import { memo } from "react";
import { useTranslation } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, TrendingUp, DollarSign, Users, Handshake, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface Goal {
  id: string;
  account_id: string | null;
  type: string;
  target_value: number;
  period: string;
  start_date: string;
  end_date: string;
}

interface GoalProgress {
  goal_id: string;
  current_value: number;
  target_value: number;
  percentage: number;
  status: "on_track" | "at_risk" | "behind";
}

const TYPE_ICONS: Record<string, typeof TrendingUp> = {
  revenue: DollarSign,
  deals_won: Handshake,
  deals_created: Handshake,
  contacts_created: Users,
  activities_logged: Activity,
};

const STATUS_COLORS: Record<string, string> = {
  on_track: "bg-emerald-500/10 text-emerald-600 border-emerald-200/50",
  at_risk: "bg-amber-500/10 text-amber-600 border-amber-200/50",
  behind: "bg-red-500/10 text-red-600 border-red-200/50",
};

function formatValue(value: number, type: string): string {
  if (type === "revenue") {
    return value >= 1000 ? `$${(value / 1000).toFixed(1)}k` : `$${value}`;
  }
  return String(value);
}

export const GoalCard = memo(function GoalCard({
  goal,
  progress,
  onDelete,
}: {
  goal: Goal;
  progress?: GoalProgress;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const Icon = TYPE_ICONS[goal.type] || TrendingUp;
  const pct = progress?.percentage || 0;
  const status = progress?.status || "on_track";

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="size-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">{t(`crm.goals.types.${goal.type}`)}</p>
            <p className="text-[10px] text-muted-foreground">
              {goal.account_id ? t("crm.goals.personal") : t("crm.goals.teamWide")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="outline" className={cn("text-[10px] border", STATUS_COLORS[status])}>
            {t(`crm.goals.statuses.${status}`)}
          </Badge>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={onDelete}>
            <Trash2 className="size-3" />
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-lg font-bold">
            {formatValue(progress?.current_value || 0, goal.type)}
          </span>
          <span className="text-xs text-muted-foreground">
            / {formatValue(goal.target_value, goal.type)}
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              status === "on_track" ? "bg-emerald-500" : status === "at_risk" ? "bg-amber-500" : "bg-red-500"
            )}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">{pct}% {t("crm.goals.complete")}</p>
      </div>

      {/* Period info */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{t(`crm.goals.periods.${goal.period}`)}</span>
        <span>{new Date(goal.start_date).toLocaleDateString()} — {new Date(goal.end_date).toLocaleDateString()}</span>
      </div>
    </div>
  );
});
