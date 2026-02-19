"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  Sparkles,
  Users,
  Handshake,
  CheckSquare,
  DollarSign,
  Clock,
  FileText,
  Plus,
  TrendingUp,
  AlertCircle,
  Info,
  Lightbulb,
  Kanban,
  Calendar,
  Upload,
  Sun,
  Moon,
  Sunset,
  Target,
  Zap,
  BarChart3,
  Building2,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccount } from "@/contexts/account-context";
import { useWorkspace } from "@/contexts/team-context";
import { UpgradeModal, useUpgradeModal } from "@/components/billing";
import { TeamCreateDialog } from "@/components/team/team-create-dialog";
import { JoinTeamDialog } from "@/components/team/join-team-dialog";
import { StatWidget } from "@/components/dashboard/widgets/stat-widget";
import { ChartWidget } from "@/components/dashboard/widgets/chart-widget";
import { ListWidget } from "@/components/dashboard/widgets/list-widget";
import { TableWidget } from "@/components/dashboard/widgets/table-widget";
import type { CrmStats, AIInsight } from "@/types/crm";

// ============================================================================
// Types
// ============================================================================

interface DashboardContentProps {
  userName: string;
  email: string;
  imageUrl: string;
}

interface DealRow {
  id: string;
  title: string;
  value: number;
  status: string;
  ai_win_probability: number;
  expected_close_date: string | null;
  created_at: string;
  deal_stages?: { name: string; color: string; position: number; is_won: boolean; is_lost: boolean } | null;
  contacts?: { first_name: string; last_name: string } | null;
  companies?: { name: string } | null;
}

interface TaskRow {
  id: string;
  title: string;
  status: string;
  priority: string;
  type: string;
  due_date: string | null;
  created_at: string;
}

interface ActivityRow {
  id: string;
  type: string;
  title: string;
  description: string | null;
  created_at: string;
}

// ============================================================================
// Constants
// ============================================================================

const TASK_STATUS_COLORS: Record<string, string> = {
  todo: "var(--landing-accent)",
  in_progress: "var(--landing-accent)",
  done: "var(--landing-accent)",
  cancelled: "#a1a1aa",
};

const TASK_STATUS_LABELS: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
  cancelled: "Cancelled",
};

const PRIORITY_BG: Record<string, string> = {
  urgent: "bg-red-500/10 border-red-500/20",
  high: "bg-orange-500/10 border-orange-500/20",
  medium: "bg-amber-500/10 border-amber-500/20",
  low: "bg-blue-500/10 border-blue-500/20",
};

const ACTIVITY_ICONS: Record<string, LucideIcon> = {
  deal_created: Handshake,
  deal_stage_changed: ArrowRight,
  deal_won: DollarSign,
  deal_lost: AlertCircle,
  contact_created: Users,
  task_completed: CheckSquare,
  note: FileText,
  call: Clock,
  email: FileText,
  meeting: Calendar,
  import: Upload,
};

const ACTIVITY_COLORS: Record<string, string> = {
  deal_created: "bg-muted/10 text-landing-accent",
  deal_stage_changed: "bg-orange-500/10 text-orange-500",
  deal_won: "bg-emerald-500/10 text-emerald-500",
  deal_lost: "bg-red-500/10 text-red-500",
  contact_created: "bg-muted/10 text-landing-accent",
  task_completed: "bg-emerald-500/10 text-emerald-500",
  note: "bg-muted/10 text-landing-accent",
  call: "bg-orange-500/10 text-orange-500",
  email: "bg-muted/10 text-landing-accent",
  meeting: "bg-orange-500/10 text-orange-500",
  import: "bg-gray-500/10 text-gray-500",
};

const INSIGHT_ICONS: Record<string, LucideIcon> = {
  warning: AlertCircle,
  opportunity: TrendingUp,
  action: Lightbulb,
  info: Info,
};

const INSIGHT_COLORS: Record<string, string> = {
  warning: "text-amber-500 bg-amber-500/10 border border-amber-500/20",
  opportunity: "text-emerald-500 bg-emerald-500/10 border border-emerald-500/20",
  action: "text-blue-500 bg-blue-500/10 border border-blue-500/20",
  info: "text-muted-foreground bg-muted border border-border",
};

// ============================================================================
// Helpers
// ============================================================================

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function getGreeting(): { text: string; icon: LucideIcon } {
  const hour = new Date().getHours();
  if (hour < 12) return { text: "Good morning", icon: Sun };
  if (hour < 17) return { text: "Good afternoon", icon: Sunset };
  return { text: "Good evening", icon: Moon };
}

// ============================================================================
// Component
// ============================================================================

export function DashboardContent({ userName }: DashboardContentProps) {
  const { account, usage, isLoading: accountLoading } = useAccount();
  const { currentWorkspace, isLoading: workspaceLoading, can, refetch } = useWorkspace();
  const { isOpen, modalProps, closeUpgradeModal } = useUpgradeModal();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);

  const [crmStats, setCrmStats] = useState<CrmStats | null>(null);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [revenueTrend, setRevenueTrend] = useState<{ date: string; revenue: number; cumulative: number }[]>([]);

  useEffect(() => {
    // Don't fetch CRM data if no workspace or no permissions
    if (!currentWorkspace || !can("contacts.read")) {
      setIsLoading(false);
      return;
    }

    const safeFetch = (url: string) =>
      fetch(url).then((r) => (r.ok ? r.json() : { success: false })).catch(() => ({ success: false }));

    Promise.all([
      safeFetch("/api/crm/stats"),
      safeFetch("/api/crm/ai/insights"),
      safeFetch("/api/crm/deals?limit=10"),
      safeFetch("/api/crm/tasks?limit=20"),
      safeFetch("/api/crm/activities?limit=8"),
      safeFetch("/api/crm/stats/revenue-trend"),
    ]).then(([statsRes, insightsRes, dealsRes, tasksRes, activitiesRes, revenueTrendRes]) => {
      if (statsRes.success) setCrmStats(statsRes.data);
      if (insightsRes.success) setInsights(insightsRes.data);
      if (dealsRes.success) setDeals(dealsRes.data);
      if (tasksRes.success) setTasks(tasksRes.data);
      if (activitiesRes.success) setActivities(activitiesRes.data);
      if (revenueTrendRes.success) setRevenueTrend(revenueTrendRes.data);
    }).finally(() => setIsLoading(false));
  }, [currentWorkspace, can]);

  const taskStatusData = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach((t) => { counts[t.status] = (counts[t.status] || 0) + 1; });
    return Object.entries(counts).map(([status, count]) => ({
      name: TASK_STATUS_LABELS[status] || status,
      value: count,
      color: TASK_STATUS_COLORS[status] || "#a1a1aa",
    }));
  }, [tasks]);

  const upcomingTasks = useMemo(() =>
    tasks
      .filter((t) => t.status === "todo" || t.status === "in_progress")
      .sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      })
      .slice(0, 5),
    [tasks]);

  const dealProgress = (deal: DealRow) => {
    if (deal.deal_stages?.is_won) return 100;
    if (deal.deal_stages?.is_lost) return 0;
    const pos = deal.deal_stages?.position ?? 0;
    return Math.min(Math.round(((pos + 1) / 5) * 100), 95);
  };

  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;

  // No active workspace or no CRM permissions — show empty state
  const hasCrmAccess = currentWorkspace && can("contacts.read");
  if (!workspaceLoading && !hasCrmAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="mx-auto max-w-md text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Нет активной команды</h2>
            <p className="text-sm text-muted-foreground">
              Создайте новую команду или присоединитесь к существующей, чтобы начать работу с CRM.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Создать команду
            </Button>
            <Button variant="outline" onClick={() => setJoinDialogOpen(true)}>
              <Users className="w-4 h-4 mr-2" />
              Присоединиться
            </Button>
          </div>
        </div>

        <TeamCreateDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onCreated={() => refetch()}
        />
        <JoinTeamDialog
          open={joinDialogOpen}
          onOpenChange={setJoinDialogOpen}
          onJoined={() => refetch()}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="mx-auto max-w-5xl space-y-8">
          <div className="space-y-2">
            <Skeleton className="h-8 w-80 rounded-lg" />
            <Skeleton className="h-4 w-56 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[120px] rounded-xl" />)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-[220px] rounded-xl" />)}
          </div>
          <Skeleton className="h-[300px] rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Workspace header */}
      <div className="border-b border-border px-8 py-6">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <GreetingIcon className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">
                {greeting.text}, <span>{userName}</span>
              </h1>
              <p className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                {crmStats && ` \u00B7 ${crmStats.tasksDueToday} tasks due today \u00B7 ${crmStats.openDeals} open deals`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="hidden sm:inline-flex" asChild>
              <Link href="/dashboard/contacts">
                <Users className="w-3.5 h-3.5 mr-2" />
                Contacts
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/pipeline">
                <Kanban className="w-3.5 h-3.5 mr-2" />
                Pipeline
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="hidden sm:inline-flex" asChild>
              <Link href="/dashboard/chats">
                <Sparkles className="w-3.5 h-3.5 mr-2" />
                AI Chat
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Dashboard grid */}
      <div className="flex-1 overflow-auto p-8">
        <div className="mx-auto max-w-5xl space-y-8">

          {/* Row 1: Key Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatWidget
              href="/dashboard/deals"
              label="Open Deals"
              value={crmStats?.openDeals ?? 0}
              subtitle={`$${(crmStats?.pipelineValue ?? 0).toLocaleString()} pipeline`}
              icon={Handshake}
            />
            <StatWidget
              href="/dashboard/analytics"
              label="Won This Month"
              value={crmStats?.wonValueThisMonth ?? 0}
              formattedValue={`$${(crmStats?.wonValueThisMonth ?? 0).toLocaleString()}`}
              subtitle={`${crmStats?.wonDealsThisMonth ?? 0} deal${(crmStats?.wonDealsThisMonth ?? 0) !== 1 ? "s" : ""} closed`}
              icon={DollarSign}
              trend={(crmStats?.wonDealsThisMonth ?? 0) > 0 ? { direction: "up", text: `${crmStats?.wonDealsThisMonth} won` } : undefined}
            />
            <StatWidget
              href="/dashboard/contacts"
              label="Contacts"
              value={crmStats?.totalContacts ?? 0}
              subtitle={`+${crmStats?.newContactsThisWeek ?? 0} this week`}
              icon={Users}
              trend={(crmStats?.newContactsThisWeek ?? 0) > 0 ? { direction: "up", text: `+${crmStats?.newContactsThisWeek}` } : undefined}
            />
            <StatWidget
              href="/dashboard/tasks"
              label="Tasks Due"
              value={crmStats?.tasksDueToday ?? 0}
              subtitle={crmStats?.overdueTasksCount ? `${crmStats.overdueTasksCount} overdue` : "All on track"}
              icon={CheckSquare}
              trend={crmStats?.overdueTasksCount ? { direction: "down", text: `${crmStats.overdueTasksCount} late` } : undefined}
            />
          </div>

          {/* Row 2: Secondary Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatWidget
              href="/dashboard/analytics"
              label="Win Rate"
              value={crmStats && (crmStats.wonDealsThisMonth + (crmStats.totalDeals - crmStats.openDeals - crmStats.wonDealsThisMonth)) > 0
                ? Math.round((crmStats.wonDealsThisMonth / Math.max(crmStats.totalDeals - crmStats.openDeals, 1)) * 100)
                : 0}
              formattedValue={`${crmStats && (crmStats.wonDealsThisMonth + (crmStats.totalDeals - crmStats.openDeals - crmStats.wonDealsThisMonth)) > 0
                ? Math.round((crmStats.wonDealsThisMonth / Math.max(crmStats.totalDeals - crmStats.openDeals, 1)) * 100)
                : 0}%`}
              subtitle="Closed deals ratio"
              icon={Target}
            />
            <StatWidget
              href="/dashboard/analytics"
              label="Forecast"
              value={crmStats?.weightedForecast ?? 0}
              formattedValue={`$${(crmStats?.weightedForecast ?? 0).toLocaleString()}`}
              subtitle="Weighted pipeline"
              icon={Zap}
            />
            <StatWidget
              href="/dashboard/companies"
              label="Organizations"
              value={crmStats?.totalDeals ?? 0}
              subtitle="Total deals tracked"
              icon={Building2}
            />
            <StatWidget
              href="/dashboard/analytics"
              label="Avg Deal"
              value={crmStats?.wonDealsThisMonth && crmStats?.wonValueThisMonth
                ? Math.round(crmStats.wonValueThisMonth / crmStats.wonDealsThisMonth)
                : 0}
              formattedValue={`$${crmStats?.wonDealsThisMonth && crmStats?.wonValueThisMonth
                ? Math.round(crmStats.wonValueThisMonth / crmStats.wonDealsThisMonth).toLocaleString()
                : "0"}`}
              subtitle="Average won deal size"
              icon={BarChart3}
            />
          </div>

          {/* Row 3: Lists — Recent Activity, AI Insights, Upcoming Tasks */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ListWidget
              title="Recent"
              icon={Clock}
              href="/dashboard/activity"
              isEmpty={activities.length === 0}
              emptyIcon={Clock}
              emptyMessage="No recent activity yet"
            >
              <div className="space-y-0">
                {activities.slice(0, 5).map((a) => {
                  const AIcon = ACTIVITY_ICONS[a.type] || Info;
                  const colorClass = ACTIVITY_COLORS[a.type] || "bg-muted text-muted-foreground";
                  return (
                    <div key={a.id} className="flex items-start gap-2 pb-4 relative">
                      <div className={cn("w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1 z-10 ring-2 ring-background", colorClass)}>
                        <AIcon className="w-3 h-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{a.title}</p>
                        <p className="text-xs text-muted-foreground">{timeAgo(a.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ListWidget>

            <ListWidget
              title="AI Insights"
              icon={Sparkles}
              href="/dashboard/chats"
              isEmpty={insights.length === 0}
              emptyIcon={Sparkles}
              emptyMessage="No insights yet. Add data to get AI-powered tips."
            >
              <div className="space-y-2">
                {insights.slice(0, 4).map((insight) => {
                  const IIcon = INSIGHT_ICONS[insight.type] || Info;
                  const color = INSIGHT_COLORS[insight.type] || INSIGHT_COLORS.info;
                  return (
                    <div key={insight.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-1", color)}>
                        <IIcon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground">{insight.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{insight.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ListWidget>

            <ListWidget
              title="Upcoming Tasks"
              icon={CheckSquare}
              href="/dashboard/tasks"
              isEmpty={upcomingTasks.length === 0}
              emptyIcon={CheckSquare}
              emptyMessage="No upcoming tasks"
            >
              <div className="space-y-2">
                {upcomingTasks.map((task) => {
                  const isOverdue = task.due_date && new Date(task.due_date) < new Date();
                  return (
                    <div
                      key={task.id}
                      className={cn(
                        "flex items-start gap-2 p-2 rounded-lg transition-all hover:bg-muted/50",
                        isOverdue && "bg-red-500/5"
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 mt-1 shrink-0 flex items-center justify-center",
                        PRIORITY_BG[task.priority] || "bg-blue-500/10 border-blue-500/20"
                      )}>
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          task.priority === "urgent" ? "bg-red-500" :
                          task.priority === "high" ? "bg-orange-500" :
                          task.priority === "medium" ? "bg-amber-500" : "bg-blue-500"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {task.due_date
                            ? new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                            : "No due date"}
                          {isOverdue && <span className="text-red-500 ml-1 font-medium">overdue</span>}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-xs shrink-0",
                          task.priority === "urgent" && "bg-red-500/10 text-red-600 border-red-500/20",
                          task.priority === "high" && "bg-orange-500/10 text-orange-600 border-orange-500/20",
                        )}
                      >
                        {task.type}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </ListWidget>
          </div>

          {/* Row 4: Deals Table */}
          <TableWidget
            title="Deals"
            icon={Handshake}
            href="/dashboard/deals"
            totalCount={deals.length}
            isEmpty={deals.length === 0}
            emptyIcon={Handshake}
            emptyMessage="No deals yet"
          >
            {/* Table header - Desktop */}
            <div className="hidden lg:grid grid-cols-[1fr_100px_140px_80px_80px_70px] gap-2 px-4 pb-2 border-b border-border">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stage</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Progress</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Value</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Close</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Win %</span>
            </div>
            {/* Table header - Mobile */}
            <div className="grid lg:hidden grid-cols-[1fr_80px_70px] gap-2 px-4 pb-2 border-b border-border">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Value</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Win %</span>
            </div>

            <div>
              {deals.map((deal) => {
                const progress = dealProgress(deal);
                const stageColor = deal.deal_stages?.color || "#cbc3b4";
                const winProb = deal.ai_win_probability;
                return (
                  <React.Fragment key={deal.id}>
                    {/* Desktop */}
                    <div>
                      <Link
                        href={`/dashboard/deals/${deal.id}`}
                        className="hidden lg:grid grid-cols-[1fr_100px_140px_80px_80px_70px] gap-2 px-4 py-2 hover:bg-muted/50 rounded-lg items-center transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-2 h-2 rounded-full shrink-0 ring-2 ring-offset-1 ring-offset-background"
                            style={{ backgroundColor: stageColor, boxShadow: `0 0 6px ${stageColor}40` }}
                          />
                          <span className="text-xs font-medium text-foreground truncate">{deal.title}</span>
                          {deal.companies?.name && (
                            <span className="text-xs text-muted-foreground truncate hidden sm:inline">{deal.companies.name}</span>
                          )}
                        </div>
                        <div>
                          <Badge variant="secondary" className="text-xs font-normal" style={{ borderColor: stageColor + "30", color: stageColor, backgroundColor: stageColor + "10" }}>
                            {deal.deal_stages?.name || "\u2014"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${stageColor}, ${stageColor}cc)` }} />
                          </div>
                          <span className="text-xs text-muted-foreground w-8 text-right">{progress}%</span>
                        </div>
                        <span className="text-xs font-medium text-foreground">${deal.value.toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground">
                          {deal.expected_close_date ? new Date(deal.expected_close_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "\u2014"}
                        </span>
                        <span className={cn("text-xs font-semibold", winProb >= 70 ? "text-emerald-500" : winProb >= 40 ? "text-amber-500" : "text-red-400")}>
                          {winProb}%
                        </span>
                      </Link>
                    </div>
                    {/* Mobile */}
                    <Link
                      href={`/dashboard/deals/${deal.id}`}
                      className="grid lg:hidden grid-cols-[1fr_80px_70px] gap-2 px-4 py-2 hover:bg-muted/50 rounded-lg items-center transition-colors"
                    >
                      <div className="flex items-start gap-2 min-w-0">
                        <div className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ backgroundColor: stageColor, boxShadow: `0 0 6px ${stageColor}40` }} />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-medium text-foreground truncate block">{deal.title}</span>
                          <Badge variant="secondary" className="text-xs font-normal mt-1" style={{ borderColor: stageColor + "30", color: stageColor, backgroundColor: stageColor + "10" }}>
                            {deal.deal_stages?.name || "\u2014"}
                          </Badge>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-foreground">${deal.value.toLocaleString()}</span>
                      <span className={cn("text-xs font-semibold", winProb >= 70 ? "text-emerald-500" : winProb >= 40 ? "text-amber-500" : "text-red-400")}>
                        {winProb}%
                      </span>
                    </Link>
                  </React.Fragment>
                );
              })}
            </div>
          </TableWidget>

          {/* Row 5: Charts — Revenue Trend + Workload */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartWidget
              title="Revenue Trend (30 Days)"
              icon={TrendingUp}
              isEmpty={revenueTrend.length === 0 || revenueTrend.every((d) => d.revenue === 0)}
              emptyIcon={DollarSign}
              emptyMessage="No revenue data yet. Close deals to see trends."
            >
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueTrend}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--landing-accent)" stopOpacity={0.3} />
                        <stop offset="50%" stopColor="var(--landing-accent)" stopOpacity={0.1} />
                        <stop offset="100%" stopColor="var(--landing-accent)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="revenueStroke" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="var(--landing-accent)" />
                        <stop offset="100%" stopColor="var(--landing-accent)" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.5} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                      interval="preserveStartEnd"
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "12px",
                        fontSize: "12px",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                      }}
                      formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
                      labelFormatter={(label) => new Date(String(label)).toLocaleDateString("en-US", { month: "long", day: "numeric" })}
                    />
                    <Area
                      type="monotone"
                      dataKey="cumulative"
                      stroke="url(#revenueStroke)"
                      strokeWidth={2.5}
                      fill="url(#revenueGradient)"
                      activeDot={{ r: 5, fill: "var(--landing-accent)", strokeWidth: 2, stroke: "var(--card)" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartWidget>

            <ChartWidget
              title="Workload by Status"
              icon={Kanban}
              isEmpty={taskStatusData.length === 0}
              emptyIcon={CheckSquare}
              emptyMessage="No tasks yet. Create tasks to see workload."
            >
              <div className="flex items-center gap-6">
                <div className="w-[170px] h-[170px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={taskStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                        animationBegin={600}
                        animationDuration={800}
                      >
                        {taskStatusData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: "12px",
                          fontSize: "12px",
                          boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-4 flex-1">
                  {taskStatusData.map((entry) => (
                    <div key={entry.name} className="flex items-center justify-between group">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full transition-transform group-hover:scale-125"
                          style={{ backgroundColor: entry.color, boxShadow: `0 0 8px ${entry.color}40` }}
                        />
                        <span className="text-xs text-foreground">{entry.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${(entry.value / tasks.length) * 100}%`, backgroundColor: entry.color }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-foreground w-6 text-right">{entry.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ChartWidget>
          </div>

          {/* Upgrade banner for free users */}
          {!accountLoading && (account?.tier === "free" || !account?.tier) && usage && usage.percentUsed >= 80 && (
            <div className="rounded-lg border border-landing-accent/30 bg-gradient-to-r from-landing-accent/5 via-landing-accent/10 to-landing-accent/5 p-4">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Sparkles className="w-4.5 h-4.5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {usage.percentUsed >= 100 ? "Usage limit reached" : "Running low on tokens"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {usage.percentUsed >= 100 ? "Upgrade to continue." : `${Math.round(usage.percentUsed)}% used this month.`}
                  </p>
                </div>
                <Button size="sm" asChild>
                  <Link href="/dashboard/account/billing">
                    Upgrade
                    <ArrowRight className="w-3.5 h-3.5 ml-2" />
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <UpgradeModal isOpen={isOpen} onClose={closeUpgradeModal} {...modalProps} />
    </div>
  );
}
