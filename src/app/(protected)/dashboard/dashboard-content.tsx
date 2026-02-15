"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
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
  MoreHorizontal,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Info,
  Lightbulb,
  Kanban,
  Calendar,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccount } from "@/contexts/account-context";
import { UpgradeModal, useUpgradeModal } from "@/components/billing";
import type { CrmStats, AIInsight } from "@/types/crm";

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
  contact_id: string | null;
  deal_id: string | null;
}

const TASK_STATUS_COLORS: Record<string, string> = {
  todo: "#6366f1",
  in_progress: "#3b82f6",
  done: "#22c55e",
  cancelled: "#a1a1aa",
};

const TASK_STATUS_LABELS: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
  cancelled: "Cancelled",
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "text-red-500",
  high: "text-orange-500",
  medium: "text-amber-500",
  low: "text-blue-500",
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

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function DashboardContent({ userName }: DashboardContentProps) {
  const { account, usage, isLoading: accountLoading } = useAccount();
  const { isOpen, modalProps, closeUpgradeModal } = useUpgradeModal();

  const [crmStats, setCrmStats] = useState<CrmStats | null>(null);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [revenueTrend, setRevenueTrend] = useState<{ date: string; revenue: number; cumulative: number }[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/crm/stats").then((r) => r.json()),
      fetch("/api/crm/ai/insights").then((r) => r.json()),
      fetch("/api/crm/deals?limit=10").then((r) => r.json()),
      fetch("/api/crm/tasks?limit=20").then((r) => r.json()),
      fetch("/api/crm/activities?limit=8").then((r) => r.json()),
      fetch("/api/crm/stats/revenue-trend").then((r) => r.json()),
    ])
      .then(([statsRes, insightsRes, dealsRes, tasksRes, activitiesRes, revenueTrendRes]) => {
        if (statsRes.success) setCrmStats(statsRes.data);
        if (insightsRes.success) setInsights(insightsRes.data);
        if (dealsRes.success) setDeals(dealsRes.data);
        if (tasksRes.success) setTasks(tasksRes.data);
        if (activitiesRes.success) setActivities(activitiesRes.data);
        if (revenueTrendRes.success) setRevenueTrend(revenueTrendRes.data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  // Compute task status distribution for pie chart
  const taskStatusData = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach((t) => {
      counts[t.status] = (counts[t.status] || 0) + 1;
    });
    return Object.entries(counts).map(([status, count]) => ({
      name: TASK_STATUS_LABELS[status] || status,
      value: count,
      color: TASK_STATUS_COLORS[status] || "#a1a1aa",
    }));
  }, [tasks]);

  const upcomingTasks = useMemo(() => {
    return tasks
      .filter((t) => t.status === "todo" || t.status === "in_progress")
      .sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      })
      .slice(0, 5);
  }, [tasks]);

  // Compute deal progress (position in pipeline as %)
  const dealProgress = (deal: DealRow) => {
    if (deal.deal_stages?.is_won) return 100;
    if (deal.deal_stages?.is_lost) return 0;
    const pos = deal.deal_stages?.position ?? 0;
    // Assume roughly 5 stages max, scale accordingly
    return Math.min(Math.round(((pos + 1) / 5) * 100), 95);
  };

  const insightIcons: Record<string, LucideIcon> = {
    warning: AlertCircle,
    opportunity: TrendingUp,
    action: Lightbulb,
    info: Info,
  };

  const insightColors: Record<string, string> = {
    warning: "text-amber-600 bg-amber-500/10",
    opportunity: "text-emerald-600 bg-emerald-500/10",
    action: "text-blue-600 bg-blue-500/10",
    info: "text-gray-600 bg-gray-500/10",
  };

  if (isLoading) {
    return (
      <div className="p-6 sm:p-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="flex gap-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Workspace header */}
      <div className="border-b border-border px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Welcome back, {userName}</h1>
            <p className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              {crmStats && ` \u00B7 ${crmStats.tasksDueToday} tasks due today \u00B7 ${crmStats.openDeals} open deals`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/pipeline">
                <Kanban className="w-3.5 h-3.5 mr-1.5" />
                Pipeline
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/chats">
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                AI Chat
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Overview content */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-5">
        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Link href="/dashboard/pipeline">
            <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Open Deals</span>
                <Handshake className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{crmStats?.openDeals ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                ${(crmStats?.pipelineValue ?? 0).toLocaleString()} pipeline
              </p>
            </Card>
          </Link>
          <Link href="/dashboard/tasks">
            <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Tasks Due</span>
                <CheckSquare className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{crmStats?.tasksDueToday ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {crmStats?.overdueTasksCount ? `${crmStats.overdueTasksCount} overdue` : "All on track"}
              </p>
            </Card>
          </Link>
          <Link href="/dashboard/contacts">
            <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Contacts</span>
                <Users className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{crmStats?.totalContacts ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                +{crmStats?.newContactsThisWeek ?? 0} this week
              </p>
            </Card>
          </Link>
          <Link href="/dashboard/analytics">
            <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Won This Month</span>
                <DollarSign className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">${(crmStats?.wonValueThisMonth ?? 0).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {crmStats?.wonDealsThisMonth ?? 0} deal{(crmStats?.wonDealsThisMonth ?? 0) !== 1 ? "s" : ""} closed
              </p>
            </Card>
          </Link>
        </div>

        {/* Top row: Recent + Notes + Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Recent */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                Recent
                <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                  <Link href="/dashboard/activity">
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </Link>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No recent activity yet</p>
              ) : (
                <div className="space-y-2.5">
                  {activities.slice(0, 5).map((a) => {
                    const Icon = ACTIVITY_ICONS[a.type] || Info;
                    return (
                      <div key={a.id} className="flex items-start gap-2.5">
                        <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5">
                          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{a.title}</p>
                          <p className="text-[10px] text-muted-foreground">{timeAgo(a.created_at)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Insights / Notes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                AI Insights
                <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" asChild>
                  <Link href="/dashboard/chats">
                    <Plus className="w-3.5 h-3.5" />
                  </Link>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {insights.length === 0 ? (
                <div className="text-center py-6">
                  <Sparkles className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-xs text-muted-foreground">No insights yet. Add data to get AI-powered tips.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {insights.slice(0, 4).map((insight) => {
                    const Icon = insightIcons[insight.type] || Info;
                    const color = insightColors[insight.type] || insightColors.info;
                    return (
                      <div key={insight.id} className="flex items-start gap-2.5">
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${color}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground">{insight.title}</p>
                          <p className="text-[10px] text-muted-foreground line-clamp-2">{insight.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Tasks */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5" />
                  Upcoming Tasks
                </span>
                <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                  <Link href="/dashboard/tasks">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {upcomingTasks.length === 0 ? (
                <div className="text-center py-6">
                  <CheckSquare className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-xs text-muted-foreground">No upcoming tasks</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingTasks.map((task) => (
                    <div key={task.id} className="flex items-start gap-2.5">
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                        task.priority === "urgent" ? "bg-red-500" :
                        task.priority === "high" ? "bg-orange-500" :
                        task.priority === "medium" ? "bg-amber-500" : "bg-blue-500"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{task.title}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {task.due_date
                            ? new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                            : "No due date"}
                          {task.due_date && new Date(task.due_date) < new Date() && (
                            <span className="text-red-500 ml-1">overdue</span>
                          )}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {task.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Deals table - like ClickUp projects list */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Deals</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">
                  {deals.length} total
                </Badge>
                <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                  <Link href="/dashboard/pipeline">View All</Link>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {/* Table header - Desktop (6 columns) */}
            <div className="hidden lg:grid grid-cols-[1fr_100px_140px_80px_80px_70px] gap-2 px-2 pb-2 border-b border-border">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Name</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Stage</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Progress</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Value</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Close</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Win %</span>
            </div>
            {/* Table header - Mobile (3 columns) */}
            <div className="grid lg:hidden grid-cols-[1fr_80px_70px] gap-2 px-2 pb-2 border-b border-border">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Name</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Value</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Win %</span>
            </div>

            {deals.length === 0 ? (
              <div className="text-center py-8">
                <Handshake className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No deals yet</p>
                <Button variant="outline" size="sm" className="mt-3" asChild>
                  <Link href="/dashboard/pipeline">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Create Deal
                  </Link>
                </Button>
              </div>
            ) : (
              <div>
                {deals.map((deal) => {
                  const progress = dealProgress(deal);
                  const stageColor = deal.deal_stages?.color || "#6366f1";
                  return (
                    <>
                      {/* Desktop view (6 columns) */}
                      <Link
                        key={`${deal.id}-desktop`}
                        href={`/dashboard/deals/${deal.id}`}
                        className="hidden lg:grid grid-cols-[1fr_100px_140px_80px_80px_70px] gap-2 px-2 py-2.5 hover:bg-muted/50 rounded-lg transition-colors items-center"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: stageColor }}
                          />
                          <span className="text-xs font-medium text-foreground truncate">{deal.title}</span>
                          {deal.companies?.name && (
                            <span className="text-[10px] text-muted-foreground truncate hidden sm:inline">
                              {deal.companies.name}
                            </span>
                          )}
                        </div>
                        <div>
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-normal"
                            style={{ borderColor: stageColor + "40", color: stageColor }}
                          >
                            {deal.deal_stages?.name || "—"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={progress} className="h-1.5 flex-1" />
                          <span className="text-[10px] text-muted-foreground w-8 text-right">{progress}%</span>
                        </div>
                        <span className="text-xs font-medium text-foreground">
                          ${deal.value.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {deal.expected_close_date
                            ? new Date(deal.expected_close_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                            : "—"}
                        </span>
                        <span className="text-xs font-medium text-foreground">{deal.ai_win_probability}%</span>
                      </Link>
                      {/* Mobile view (3 columns) */}
                      <Link
                        key={`${deal.id}-mobile`}
                        href={`/dashboard/deals/${deal.id}`}
                        className="grid lg:hidden grid-cols-[1fr_80px_70px] gap-2 px-2 py-2.5 hover:bg-muted/50 rounded-lg transition-colors items-center"
                      >
                        <div className="flex items-start gap-2 min-w-0">
                          <div
                            className="w-1.5 h-1.5 rounded-full shrink-0 mt-1"
                            style={{ backgroundColor: stageColor }}
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-medium text-foreground truncate block">{deal.title}</span>
                            <Badge
                              variant="secondary"
                              className="text-[10px] font-normal mt-1"
                              style={{ borderColor: stageColor + "40", color: stageColor }}
                            >
                              {deal.deal_stages?.name || "—"}
                            </Badge>
                          </div>
                        </div>
                        <span className="text-xs font-medium text-foreground">
                          ${deal.value.toLocaleString()}
                        </span>
                        <span className="text-xs font-medium text-foreground">{deal.ai_win_probability}%</span>
                      </Link>
                    </>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bottom row: Revenue Trend + Workload */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Revenue Trend Chart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                Revenue Trend (30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {revenueTrend.length === 0 || revenueTrend.every((d) => d.revenue === 0) ? (
                <div className="text-center py-8">
                  <DollarSign className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3" />
                  <p className="text-sm text-muted-foreground">No revenue data yet. Close deals to see trends.</p>
                </div>
              ) : (
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={revenueTrend}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        tick={{ fontSize: 10 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
                        labelFormatter={(label) => new Date(String(label)).toLocaleDateString("en-US", { month: "long", day: "numeric" })}
                      />
                      <Line type="monotone" dataKey="cumulative" stroke="#22c55e" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Workload by Status - Pie Chart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Workload by Status</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {taskStatusData.length === 0 ? (
                <div className="text-center py-8">
                  <CheckSquare className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3" />
                  <p className="text-sm text-muted-foreground">No tasks yet. Create tasks to see workload.</p>
                </div>
              ) : (
                <div className="flex items-center gap-6">
                  <div className="w-[160px] h-[160px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={taskStatusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={72}
                          paddingAngle={2}
                          dataKey="value"
                          stroke="none"
                        >
                          {taskStatusData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "var(--card)",
                            border: "1px solid var(--border)",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 flex-1">
                    {taskStatusData.map((entry) => (
                      <div key={entry.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="text-xs text-foreground">{entry.name}</span>
                        </div>
                        <span className="text-xs font-semibold text-foreground">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Plan info for free users */}
        {!accountLoading && account?.tier === "free" && usage && usage.percentUsed >= 80 && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {usage.percentUsed >= 100 ? "Usage limit reached" : "Running low on tokens"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {usage.percentUsed >= 100
                      ? "Upgrade to continue."
                      : `${Math.round(usage.percentUsed)}% used this month.`}
                  </p>
                </div>
                <Button size="sm" asChild>
                  <Link href="/dashboard/account/billing">
                    Upgrade
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <UpgradeModal isOpen={isOpen} onClose={closeUpgradeModal} {...modalProps} />
    </div>
  );
}
