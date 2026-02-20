"use client";

import { useState, useEffect, useCallback } from "react";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Target, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { GoalCard } from "@/components/goals/goal-card";
import { GoalForm } from "@/components/goals/goal-form";

interface Goal {
  id: string;
  account_id: string | null;
  type: string;
  target_value: number;
  period: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

interface GoalProgress {
  goal_id: string;
  current_value: number;
  target_value: number;
  percentage: number;
  status: "on_track" | "at_risk" | "behind";
}

const PERIOD_TABS = ["monthly", "quarterly", "yearly"] as const;
const SCOPE_TABS = ["all", "my", "team"] as const;

export function GoalsContent() {
  const { t } = useTranslation();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [progress, setProgress] = useState<GoalProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<string>("monthly");
  const [scope, setScope] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    try {
      const [goalsRes, progressRes] = await Promise.all([
        fetch(`/api/crm/goals?period=${period}&scope=${scope}`),
        fetch("/api/crm/goals/progress"),
      ]);
      const goalsJson = await goalsRes.json();
      const progressJson = await progressRes.json();

      if (goalsJson.success) setGoals(goalsJson.data || []);
      if (progressJson.success) setProgress(progressJson.data || []);
    } catch {
      toast.error(t("crm.goals.failedLoad"));
    } finally {
      setLoading(false);
    }
  }, [period, scope, t]);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  const handleCreated = () => {
    setShowForm(false);
    fetchGoals();
    toast.success(t("crm.goals.created"));
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/crm/goals/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setGoals((prev) => prev.filter((g) => g.id !== id));
        toast.success(t("crm.goals.deleted"));
      }
    } catch {
      toast.error(t("crm.goals.failedDelete"));
    }
  };

  const getProgress = (goalId: string) => progress.find((p) => p.goal_id === goalId);

  return (
    <PageContainer>
      <PageHeader title={t("crm.goals.title")} description={t("crm.goals.description")}>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="size-4 mr-1.5" />
          {t("crm.goals.new")}
        </Button>
      </PageHeader>

      {showForm && (
        <GoalForm onCreated={handleCreated} onCancel={() => setShowForm(false)} />
      )}

      {/* Period tabs */}
      <div className="flex items-center gap-4">
        <div className="flex gap-1">
          {PERIOD_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setPeriod(tab)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                period === tab
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              {t(`crm.goals.periods.${tab}`)}
            </button>
          ))}
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex gap-1">
          {SCOPE_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setScope(tab)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                scope === tab
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              {t(`crm.goals.scopes.${tab}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Goals grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Target className="size-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">{t("crm.goals.empty")}</p>
          <p className="text-xs text-muted-foreground/70 mt-1">{t("crm.goals.emptyDesc")}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              progress={getProgress(goal.id)}
              onDelete={() => handleDelete(goal.id)}
            />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
