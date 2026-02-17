"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  MoreHorizontal,
  ArrowRight,
  TrendingUp,
  TrendingDown,
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
  Timer,
  BarChart3,
  Building2,
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

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "text-red-500",
  high: "text-orange-500",
  medium: "text-amber-500",
  low: "text-blue-500",
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

function getGreeting(): { text: string; icon: LucideIcon; emoji: string } {
  const hour = new Date().getHours();
  if (hour < 12) return { text: "Good morning", icon: Sun, emoji: "" };
  if (hour < 17) return { text: "Good afternoon", icon: Sunset, emoji: "" };
  return { text: "Good evening", icon: Moon, emoji: "" };
}

// Animated number counter hook
function useAnimatedNumber(target: number, duration = 1200): number {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef<number>(undefined);

  useEffect(() => {
    const startTime = Date.now();
    const startValue = 0;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(startValue + (target - startValue) * eased));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return current;
}

// Stat card sub-component with animated number
function AnimatedStatCard({
  href,
  label,
  value,
  formattedValue,
  subtitle,
  icon: Icon,
  iconGradient,
  trend,
  delay,
}: {
  href: string;
  label: string;
  value: number;
  formattedValue?: string;
  subtitle: string;
  icon: LucideIcon;
  iconGradient: string;
  trend?: { direction: "up" | "down"; text: string };
  delay: number;
}) {
  const animatedValue = useAnimatedNumber(value);

  return (
    <Link href={href}>
      <Card className="p-4 cursor-pointer hover:bg-muted/50 transition-colors group">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", iconGradient)}>
            <Icon className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
        <div className="text-2xl font-bold tracking-tight">
          {formattedValue
            ? formattedValue.replace(/[\d,]+/, animatedValue.toLocaleString())
            : animatedValue.toLocaleString()
          }
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-xs text-muted-foreground">{subtitle}</p>
          {trend && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium",
              trend.direction === "up" ? "text-emerald-500" : "text-red-500"
            )}>
              {trend.direction === "up" ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {trend.text}
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
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
    const safeFetch = (url: string) =>
      fetch(url)
        .then((r) => (r.ok ? r.json() : { success: false }))
        .catch(() => ({ success: false }));

    Promise.all([
      safeFetch("/api/crm/stats"),
      safeFetch("/api/crm/ai/insights"),
      safeFetch("/api/crm/deals?limit=10"),
      safeFetch("/api/crm/tasks?limit=20"),
      safeFetch("/api/crm/activities?limit=8"),
      safeFetch("/api/crm/stats/revenue-trend"),
    ])
      .then(([statsRes, insightsRes, dealsRes, tasksRes, activitiesRes, revenueTrendRes]) => {
        if (statsRes.success) setCrmStats(statsRes.data);
        if (insightsRes.success) setInsights(insightsRes.data);
        if (dealsRes.success) setDeals(dealsRes.data);
        if (tasksRes.success) setTasks(tasksRes.data);
        if (activitiesRes.success) setActivities(activitiesRes.data);
        if (revenueTrendRes.success) setRevenueTrend(revenueTrendRes.data);
      })
      .finally(() => setIsLoading(false));
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
    return Math.min(Math.round(((pos + 1) / 5) * 100), 95);
  };

  const insightIcons: Record<string, LucideIcon> = {
    warning: AlertCircle,
    opportunity: TrendingUp,
    action: Lightbulb,
    info: Info,
  };

  const insightColors: Record<string, string> = {
    warning: "text-amber-500 bg-amber-500/10 border border-amber-500/20",
    opportunity: "text-emerald-500 bg-emerald-500/10 border border-emerald-500/20",
    action: "text-blue-500 bg-blue-500/10 border border-blue-500/20",
    info: "text-muted-foreground bg-muted border border-border",
  };

  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;

  if (isLoading) {
    return (
      <div className="p-8 space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-80 rounded-lg" />
          <Skeleton className="h-4 w-56 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[120px] rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-[220px] rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[300px] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Workspace header */}
      <div className="border-b border-border px-8 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <GreetingIcon className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">
                {greeting.text},{" "}
                <span>{userName}</span>
              </h1>
              <p className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                {crmStats && ` \u00B7 ${crmStats.tasksDueToday} tasks due today \u00B7 ${crmStats.openDeals} open deals`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="group/btn hidden sm:inline-flex" asChild>
              <Link href="/dashboard/contacts">
                <Users className="w-3.5 h-3.5 mr-1.5 transition-transform group-hover/btn:scale-110" />
                Contacts
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="group/btn" asChild>
              <Link href="/dashboard/pipeline">
                <Kanban className="w-3.5 h-3.5 mr-1.5 transition-transform group-hover/btn:scale-110" />
                Pipeline
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="group/btn hidden sm:inline-flex" asChild>
              <Link href="/dashboard/analytics">
                <BarChart3 className="w-3.5 h-3.5 mr-1.5 transition-transform group-hover/btn:scale-110" />
                Analytics
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="group/btn" asChild>
              <Link href="/dashboard/chats">
                <Sparkles className="w-3.5 h-3.5 mr-1.5 transition-transform group-hover/btn:rotate-12 group-hover/btn:scale-110" />
                AI Chat
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Overview content */}
      <div className="flex-1 overflow-auto p-8 space-y-8">
        {/* Stats row - animated cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <AnimatedStatCard
            href="/dashboard/pipeline"
            label="Open Deals"
            value={crmStats?.openDeals ?? 0}
            subtitle={`$${(crmStats?.pipelineValue ?? 0).toLocaleString()} pipeline`}
            icon={Handshake}
            iconGradient="bg-muted"
            delay={0.1}
          />
          <AnimatedStatCard
            href="/dashboard/tasks"
            label="Tasks Due"
            value={crmStats?.tasksDueToday ?? 0}
            subtitle={crmStats?.overdueTasksCount ? `${crmStats.overdueTasksCount} overdue` : "All on track"}
            icon={CheckSquare}
            iconGradient="bg-muted"
            trend={crmStats?.overdueTasksCount ? { direction: "down", text: `${crmStats.overdueTasksCount} late` } : undefined}
            delay={0.15}
          />
          <AnimatedStatCard
            href="/dashboard/contacts"
            label="Contacts"
            value={crmStats?.totalContacts ?? 0}
            subtitle={`+${crmStats?.newContactsThisWeek ?? 0} this week`}
            icon={Users}
            iconGradient="bg-muted"
            trend={
              (crmStats?.newContactsThisWeek ?? 0) > 0
                ? { direction: "up", text: `+${crmStats?.newContactsThisWeek}` }
                : undefined
            }
            delay={0.2}
          />
          <AnimatedStatCard
            href="/dashboard/analytics"
            label="Won This Month"
            value={crmStats?.wonValueThisMonth ?? 0}
            formattedValue={`$${(crmStats?.wonValueThisMonth ?? 0).toLocaleString()}`}
            subtitle={`${crmStats?.wonDealsThisMonth ?? 0} deal${(crmStats?.wonDealsThisMonth ?? 0) !== 1 ? "s" : ""} closed`}
            icon={DollarSign}
            iconGradient="bg-muted"
            trend={
              (crmStats?.wonDealsThisMonth ?? 0) > 0
                ? { direction: "up", text: `${crmStats?.wonDealsThisMonth} won` }
                : undefined
            }
            delay={0.25}
          />
        </div>

        {/* Extra metrics row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <AnimatedStatCard
            href="/dashboard/analytics"
            label="Win Rate"
            value={crmStats && (crmStats.wonDealsThisMonth + (crmStats.totalDeals - crmStats.openDeals - crmStats.wonDealsThisMonth)) > 0
              ? Math.round((crmStats.wonDealsThisMonth / Math.max(crmStats.totalDeals - crmStats.openDeals, 1)) * 100)
              : 0
            }
            formattedValue={`${crmStats && (crmStats.wonDealsThisMonth + (crmStats.totalDeals - crmStats.openDeals - crmStats.wonDealsThisMonth)) > 0
              ? Math.round((crmStats.wonDealsThisMonth / Math.max(crmStats.totalDeals - crmStats.openDeals, 1)) * 100)
              : 0}%`}
            subtitle="Closed deals ratio"
            icon={Target}
            iconGradient="bg-muted"
            delay={0.3}
          />
          <AnimatedStatCard
            href="/dashboard/analytics"
            label="Forecast"
            value={crmStats?.weightedForecast ?? 0}
            formattedValue={`$${(crmStats?.weightedForecast ?? 0).toLocaleString()}`}
            subtitle="Weighted pipeline"
            icon={Zap}
            iconGradient="bg-muted"
            delay={0.35}
          />
          <AnimatedStatCard
            href="/dashboard/companies"
            label="Companies"
            value={crmStats?.totalDeals ?? 0}
            subtitle="Total deals tracked"
            icon={Building2}
            iconGradient="bg-muted"
            delay={0.4}
          />
          <AnimatedStatCard
            href="/dashboard/analytics"
            label="Avg Deal"
            value={crmStats?.wonDealsThisMonth && crmStats?.wonValueThisMonth
              ? Math.round(crmStats.wonValueThisMonth / crmStats.wonDealsThisMonth)
              : 0
            }
            formattedValue={`$${crmStats?.wonDealsThisMonth && crmStats?.wonValueThisMonth
              ? Math.round(crmStats.wonValueThisMonth / crmStats.wonDealsThisMonth).toLocaleString()
              : "0"
            }`}
            subtitle="Average won deal size"
            icon={BarChart3}
            iconGradient="bg-muted"
            delay={0.45}
          />
        </div>

        {/* Top row: Recent + AI Insights + Upcoming Tasks */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Recent Activity */}
          <div>
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-md bg-muted flex items-center justify-center">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                    </div>
                    Recent
                  </span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-muted/80" asChild>
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
                  <div className="space-y-0 timeline-line">
                    {activities.slice(0, 5).map((a) => {
                      const Icon = ACTIVITY_ICONS[a.type] || Info;
                      const colorClass = ACTIVITY_COLORS[a.type] || "bg-muted text-muted-foreground";
                      return (
                        <div
                          key={a.id}
                          className="flex items-start gap-2 pb-3 relative"
                        >
                          <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 z-10 ring-2 ring-background",
                            colorClass
                          )}>
                            <Icon className="w-3 h-3" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{a.title}</p>
                            <p className="text-xs text-muted-foreground">{timeAgo(a.created_at)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* AI Insights */}
          <div>
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-md bg-muted flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-muted-foreground" />
                  </div>
                  AI Insights
                  <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto hover:bg-muted/80" asChild>
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
                  <div className="space-y-2">
                    {insights.slice(0, 4).map((insight) => {
                      const Icon = insightIcons[insight.type] || Info;
                      const color = insightColors[insight.type] || insightColors.info;
                      return (
                        <div
                          key={insight.id}
                          className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5", color)}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground">{insight.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2">{insight.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Tasks */}
          <div>
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-md bg-muted flex items-center justify-center">
                      <CheckSquare className="w-3 h-3 text-muted-foreground" />
                    </div>
                    Upcoming Tasks
                  </span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-muted/80" asChild>
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
                            "w-5 h-5 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center",
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
                              {isOverdue && (
                                <span className="text-red-500 ml-1 font-medium">overdue</span>
                              )}
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
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Deals table */}
        <div>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-muted flex items-center justify-center">
                    <Handshake className="w-3 h-3 text-muted-foreground" />
                  </div>
                  Deals
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {deals.length} total
                  </Badge>
                  <Button variant="outline" size="sm" className="h-7 text-xs group/btn" asChild>
                    <Link href="/dashboard/pipeline">
                      View All
                      <ArrowRight className="w-3 h-3 ml-1 transition-transform group-hover/btn:translate-x-0.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {/* Table header - Desktop (6 columns) */}
              <div className="hidden lg:grid grid-cols-[1fr_100px_140px_80px_80px_70px] gap-2 px-3 pb-2 border-b border-border">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stage</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Progress</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Value</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Close</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Win %</span>
              </div>
              {/* Table header - Mobile (3 columns) */}
              <div className="grid lg:hidden grid-cols-[1fr_80px_70px] gap-2 px-3 pb-2 border-b border-border">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Value</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Win %</span>
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
                  {deals.map((deal, index) => {
                    const progress = dealProgress(deal);
                    const stageColor = deal.deal_stages?.color || "#cbc3b4";
                    const winProb = deal.ai_win_probability;
                    return (
                      <React.Fragment key={deal.id}>
                        {/* Desktop view (6 columns) */}
                        <div>
                          <Link
                            href={`/dashboard/deals/${deal.id}`}
                            className="hidden lg:grid grid-cols-[1fr_100px_140px_80px_80px_70px] gap-2 px-3 py-2.5 deal-row-hover rounded-lg items-center"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className="w-2 h-2 rounded-full shrink-0 ring-2 ring-offset-1 ring-offset-background"
                                style={{ backgroundColor: stageColor, boxShadow: `0 0 6px ${stageColor}40` }}
                              />
                              <span className="text-xs font-medium text-foreground truncate">{deal.title}</span>
                              {deal.companies?.name && (
                                <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                                  {deal.companies.name}
                                </span>
                              )}
                            </div>
                            <div>
                              <Badge
                                variant="secondary"
                                className="text-xs font-normal"
                                style={{
                                  borderColor: stageColor + "30",
                                  color: stageColor,
                                  backgroundColor: stageColor + "10",
                                }}
                              >
                                {deal.deal_stages?.name || "\u2014"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-700"
                                  style={{
                                    width: `${progress}%`,
                                    background: `linear-gradient(90deg, ${stageColor}, ${stageColor}cc)`,
                                  }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground w-8 text-right">{progress}%</span>
                            </div>
                            <span className="text-xs font-medium text-foreground">
                              ${deal.value.toLocaleString()}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {deal.expected_close_date
                                ? new Date(deal.expected_close_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                                : "\u2014"}
                            </span>
                            <span className={cn(
                              "text-xs font-semibold",
                              winProb >= 70 ? "text-emerald-500" :
                              winProb >= 40 ? "text-amber-500" : "text-red-400"
                            )}>
                              {winProb}%
                            </span>
                          </Link>
                        </div>
                        {/* Mobile view (3 columns) */}
                        <Link
                          href={`/dashboard/deals/${deal.id}`}
                          className="grid lg:hidden grid-cols-[1fr_80px_70px] gap-2 px-3 py-2.5 deal-row-hover rounded-lg items-center"
                        >
                          <div className="flex items-start gap-2 min-w-0">
                            <div
                              className="w-2 h-2 rounded-full shrink-0 mt-1"
                              style={{ backgroundColor: stageColor, boxShadow: `0 0 6px ${stageColor}40` }}
                            />
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-medium text-foreground truncate block">{deal.title}</span>
                              <Badge
                                variant="secondary"
                                className="text-xs font-normal mt-1"
                                style={{
                                  borderColor: stageColor + "30",
                                  color: stageColor,
                                  backgroundColor: stageColor + "10",
                                }}
                              >
                                {deal.deal_stages?.name || "\u2014"}
                              </Badge>
                            </div>
                          </div>
                          <span className="text-xs font-medium text-foreground">
                            ${deal.value.toLocaleString()}
                          </span>
                          <span className={cn(
                            "text-xs font-semibold",
                            winProb >= 70 ? "text-emerald-500" :
                            winProb >= 40 ? "text-amber-500" : "text-red-400"
                          )}>
                            {winProb}%
                          </span>
                        </Link>
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom row: Revenue Trend + Workload */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Revenue Trend Chart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-muted flex items-center justify-center">
                  <TrendingUp className="w-3 h-3 text-muted-foreground" />
                </div>
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
              )}
            </CardContent>
          </Card>

          {/* Workload by Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-muted flex items-center justify-center">
                  <Kanban className="w-3 h-3 text-muted-foreground" />
                </div>
                Workload by Status
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {taskStatusData.length === 0 ? (
                <div className="text-center py-8">
                  <CheckSquare className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3" />
                  <p className="text-sm text-muted-foreground">No tasks yet. Create tasks to see workload.</p>
                </div>
              ) : (
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
                  <div className="space-y-3 flex-1">
                    {taskStatusData.map((entry) => (
                      <div
                        key={entry.name}
                        className="flex items-center justify-between group"
                      >
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
                              style={{
                                width: `${(entry.value / tasks.length) * 100}%`,
                                backgroundColor: entry.color,
                              }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-foreground w-6 text-right">{entry.value}</span>
                        </div>
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
          <div>
            <Card className="border-landing-accent/30 bg-gradient-to-r from-landing-accent/5 via-landing-accent/10 to-landing-accent/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Sparkles className="w-4.5 h-4.5 text-muted-foreground" />
                  </div>
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
                  <Button size="sm" className="bg-gradient-to-r from-landing-accent to-landing-accent text-muted-foreground border-0 hover:opacity-90" asChild>
                    <Link href="/dashboard/account/billing">
                      Upgrade
                      <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <UpgradeModal isOpen={isOpen} onClose={closeUpgradeModal} {...modalProps} />
    </div>
  );
}
