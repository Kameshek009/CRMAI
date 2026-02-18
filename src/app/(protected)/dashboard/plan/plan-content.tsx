"use client";

import { useState, useEffect, useCallback } from "react";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { useTeam } from "@/contexts/team-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Target, Plus, Trash2, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

interface PlanGoal {
  id: string;
  text: string;
  completed: boolean;
}

interface TeamPlan {
  title: string;
  goals: PlanGoal[];
  updatedAt: string;
  updatedBy: string;
}

export function PlanContent() {
  const { currentTeam, isDirector, isLoading: teamLoading } = useTeam();
  const [plan, setPlan] = useState<TeamPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Editable state (director only)
  const [title, setTitle] = useState("");
  const [goals, setGoals] = useState<PlanGoal[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const fetchPlan = useCallback(async () => {
    if (!currentTeam?.id) return;
    try {
      const res = await fetch(`/api/teams/${currentTeam.id}/plan`);
      const json = await res.json();
      if (json.success && json.data) {
        setPlan(json.data);
        setTitle(json.data.title);
        setGoals(json.data.goals);
      } else {
        setPlan(null);
        setTitle("");
        setGoals([]);
      }
    } catch {
      toast.error("Failed to load plan");
    } finally {
      setIsLoading(false);
    }
  }, [currentTeam?.id]);

  useEffect(() => {
    if (currentTeam?.id) fetchPlan();
  }, [currentTeam?.id, fetchPlan]);

  const handleSave = async () => {
    if (!currentTeam?.id) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/teams/${currentTeam.id}/plan`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, goals }),
      });
      const json = await res.json();
      if (json.success) {
        setPlan(json.data);
        setHasChanges(false);
        toast.success("Plan saved");
      } else {
        toast.error(json.error || "Failed to save");
      }
    } catch {
      toast.error("Failed to save plan");
    } finally {
      setIsSaving(false);
    }
  };

  const addGoal = () => {
    setGoals((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text: "", completed: false },
    ]);
    setHasChanges(true);
  };

  const removeGoal = (id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    setHasChanges(true);
  };

  const updateGoalText = (id: string, text: string) => {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, text } : g)));
    setHasChanges(true);
  };

  const toggleGoal = (id: string) => {
    setGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, completed: !g.completed } : g))
    );
    setHasChanges(true);
  };

  if (teamLoading || isLoading) {
    return (
      <PageContainer>
        <PageHeader title="Plan" />
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-3/4" />
        </div>
      </PageContainer>
    );
  }

  const completedCount = goals.filter((g) => g.completed).length;
  const progress = goals.length > 0 ? Math.round((completedCount / goals.length) * 100) : 0;

  // Director: editable view
  if (isDirector) {
    return (
      <PageContainer>
        <PageHeader title="Team Plan" description="Set goals for your team">
          <Button onClick={handleSave} disabled={isSaving || !hasChanges || !title.trim()}>
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            <span className="ml-2">Save</span>
          </Button>
        </PageHeader>

        <Card>
          <CardContent className="p-8 space-y-8">
            {/* Title */}
            <Input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setHasChanges(true);
              }}
              placeholder="Plan title..."
              className="text-lg font-semibold h-12"
            />

            {/* Progress bar */}
            {goals.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{completedCount}/{goals.length} ({progress}%)</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Goals */}
            <div className="space-y-4">
              {goals.map((goal) => (
                <div key={goal.id} className="flex items-center gap-4">
                  <Checkbox
                    checked={goal.completed}
                    onCheckedChange={() => toggleGoal(goal.id)}
                  />
                  <Input
                    value={goal.text}
                    onChange={(e) => updateGoalText(goal.id, e.target.value)}
                    placeholder="Goal..."
                    className={cn(goal.completed && "line-through text-muted-foreground")}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeGoal(goal.id)}
                    className="shrink-0 text-muted-foreground hover:text-red-500"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Add goal button */}
            <Button variant="outline" onClick={addGoal} className="w-full">
              <Plus className="size-4 mr-2" />
              Add Goal
            </Button>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  // Member: read-only view
  if (!plan) {
    return (
      <PageContainer>
        <PageHeader title="Team Plan" />
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-muted mb-4">
                <Target className="size-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium">No plan set yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                The director has not set a team plan yet.
              </p>
            </div>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader title="Team Plan" description={`Updated ${new Date(plan.updatedAt).toLocaleDateString()}`} />

      <Card>
        <CardContent className="p-8 space-y-8">
          {/* Title */}
          <h2 className="text-xl font-bold">{plan.title}</h2>

          {/* Progress bar */}
          {goals.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{completedCount}/{goals.length} ({progress}%)</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Goals (read-only) */}
          <div className="space-y-4">
            {goals.map((goal) => (
              <div key={goal.id} className="flex items-center gap-4">
                <Checkbox checked={goal.completed} disabled />
                <span className={cn("text-sm", goal.completed && "line-through text-muted-foreground")}>
                  {goal.text}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
