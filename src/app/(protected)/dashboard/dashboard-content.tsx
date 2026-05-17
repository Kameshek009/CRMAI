"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  Pencil,
  Save,
  X,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccount } from "@/contexts/account-context";
import { useWorkspace } from "@/contexts/team-context";
import { UpgradeModal, useUpgradeModal } from "@/components/billing";
import { TeamCreateDialog } from "@/components/team/team-create-dialog";
import { JoinTeamDialog } from "@/components/team/join-team-dialog";
import { StatWidget } from "@/components/dashboard/widgets/stat-widget";
import { ListWidget } from "@/components/dashboard/widgets/list-widget";
import { TableWidget } from "@/components/dashboard/widgets/table-widget";
import { WidgetPicker } from "@/components/dashboard/widget-picker";
import { useTranslation } from "@/lib/i18n";
import type { Layout } from "react-grid-layout";
import { toast } from "sonner";
import type { CrmStats, AIInsight } from "@/types/crm";

const DashboardCharts = dynamic(
  () => import("@/components/dashboard/widgets/dashboard-charts").then((m) => ({ default: m.DashboardCharts })),
  { ssr: false, loading: () => <div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><Skeleton className="h-[280px] rounded-xl" /><Skeleton className="h-[280px] rounded-xl" /></div> }
);

// react-grid-layout uses window.matchMedia + measures DOM width — anything
// it touches must be client-only or it explodes on first SSR pass.
const DashboardGrid = dynamic(
  () => import("@/components/dashboard/dashboard-grid").then((m) => ({ default: m.DashboardGrid })),
  { ssr: false, loading: () => <div className="grid grid-cols-2 lg:grid-cols-4 gap-4"><Skeleton className="h-[120px] rounded-xl" /><Skeleton className="h-[120px] rounded-xl" /><Skeleton className="h-[120px] rounded-xl" /><Skeleton className="h-[120px] rounded-xl" /></div> }
);

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
// Dashboard Widget Layout
// ============================================================================

interface DashboardWidget {
  i: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

// 12-column grid. Stats are 3 wide x 2 tall (four per row); lists are
// 4 wide x 6 tall (three per row); full-width widgets span 12.
const DEFAULT_WIDGETS: DashboardWidget[] = [
  { i: "w1", type: "stat_openDeals", x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
  { i: "w2", type: "stat_wonThisMonth", x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
  { i: "w3", type: "stat_contacts", x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
  { i: "w4", type: "stat_tasksDue", x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
  { i: "w5", type: "stat_winRate", x: 0, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
  { i: "w6", type: "stat_forecast", x: 3, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
  { i: "w7", type: "stat_organizations", x: 6, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
  { i: "w8", type: "stat_avgDeal", x: 9, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
  { i: "w9", type: "list_recentActivity", x: 0, y: 4, w: 4, h: 6, minW: 3, minH: 4 },
  { i: "w10", type: "list_aiInsights", x: 4, y: 4, w: 4, h: 6, minW: 3, minH: 4 },
  { i: "w11", type: "list_upcomingTasks", x: 8, y: 4, w: 4, h: 6, minW: 3, minH: 4 },
  { i: "w12", type: "table_deals", x: 0, y: 10, w: 12, h: 8, minW: 6, minH: 4 },
  { i: "w13", type: "chart_revenue", x: 0, y: 18, w: 12, h: 8, minW: 6, minH: 4 },
];

// Default coords for a freshly inserted widget. Caller appends y=Infinity so
// vertical compaction drops it at the bottom.
const NEW_WIDGET_DEFAULTS: Record<string, { w: number; h: number; minW?: number; minH?: number }> = {
  stat: { w: 3, h: 2, minW: 2, minH: 2 },
  list: { w: 4, h: 6, minW: 3, minH: 4 },
  table: { w: 12, h: 8, minW: 6, minH: 4 },
  chart: { w: 12, h: 8, minW: 6, minH: 4 },
};

function widgetDefaults(type: string): { w: number; h: number; minW?: number; minH?: number } {
  const family = type.split("_")[0] ?? "stat";
  return NEW_WIDGET_DEFAULTS[family] ?? NEW_WIDGET_DEFAULTS.stat!;
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
// EditWrapper for dashboard constructor
// ============================================================================

function EditWrapper({ editMode, widgetId, onRemove, children }: {
  editMode: boolean;
  widgetId: string;
  onRemove: (id: string) => void;
  children: React.ReactNode;
}) {
  if (!editMode) return <>{children}</>;
  return (
    <div className="relative group h-full">
      {children}
      <div className="absolute inset-0 rounded-xl border-2 border-dashed border-primary/30 pointer-events-none" />
      <button
        onClick={() => onRemove(widgetId)}
        className="no-drag absolute top-2 right-2 p-1 rounded-md bg-background/90 border shadow-sm hover:bg-destructive/10 text-destructive z-10"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function DashboardContent({ userName }: DashboardContentProps) {
  const { t } = useTranslation();
  const { account, usage, isLoading: accountLoading } = useAccount();
  const { currentWorkspace, isLoading: workspaceLoading, can, refetch } = useWorkspace();
  const { isOpen, modalProps, closeUpgradeModal } = useUpgradeModal();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);

  // Dashboard constructor state
  const [editMode, setEditMode] = useState(false);
  const [widgets, setWidgets] = useState<DashboardWidget[]>(DEFAULT_WIDGETS);
  const [savedLayoutId, setSavedLayoutId] = useState<string | null>(null);
  const [isSavingLayout, setIsSavingLayout] = useState(false);
  const [showWidgetPicker, setShowWidgetPicker] = useState(false);

  const [crmStats, setCrmStats] = useState<CrmStats | null>(null);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [deals, setDeals] = useState<DealRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [revenueTrend, setRevenueTrend] = useState<{ date: string; revenue: number; cumulative: number }[]>([]);

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return t("crm.activity.justNow");
    if (minutes < 60) return t("crm.activity.mAgo", { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t("crm.activity.hAgo", { count: hours });
    const days = Math.floor(hours / 24);
    if (days < 7) return t("crm.activity.dAgo", { count: days });
    return new Date(dateStr).toLocaleDateString();
  }

  function getGreeting(): { text: string; icon: LucideIcon } {
    const hour = new Date().getHours();
    if (hour < 12) return { text: t("crm.dashboard.goodMorning"), icon: Sun };
    if (hour < 17) return { text: t("crm.dashboard.goodAfternoon"), icon: Sunset };
    return { text: t("crm.dashboard.goodEvening"), icon: Moon };
  }

  function getTaskStatusLabels(): Record<string, string> {
    return {
      todo: t("crm.tasks.statuses.todo"),
      in_progress: t("crm.tasks.statuses.inProgress"),
      done: t("crm.tasks.statuses.done"),
      cancelled: t("crm.tasks.statuses.cancelled"),
    };
  }

  useEffect(() => {
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

  // Load saved layout
  useEffect(() => {
    if (!currentWorkspace) return;
    fetch("/api/crm/dashboard-layouts")
      .then((r) => r.ok ? r.json() : { success: false })
      .then((json) => {
        if (json.success && json.data?.length > 0) {
          const layout = json.data[0];
          setSavedLayoutId(layout.id);
          if (layout.widgets?.length > 0) {
            // Tolerate rows from before drag/resize was introduced — they only
            // carry { i, type } and need synthetic coords.
            setWidgets(
              layout.widgets.map((w: Partial<DashboardWidget>, idx: number) => {
                const defaults = widgetDefaults(w.type ?? "stat");
                return {
                  i: w.i ?? `w${idx + 1}`,
                  type: w.type ?? "stat_openDeals",
                  x: typeof w.x === "number" ? w.x : 0,
                  y: typeof w.y === "number" ? w.y : idx,
                  w: typeof w.w === "number" && w.w > 0 ? w.w : defaults.w,
                  h: typeof w.h === "number" && w.h > 0 ? w.h : defaults.h,
                  minW: w.minW ?? defaults.minW,
                  minH: w.minH ?? defaults.minH,
                };
              }),
            );
          }
        }
      })
      .catch(() => {});
  }, [currentWorkspace]);

  const handleSaveLayout = useCallback(async () => {
    setIsSavingLayout(true);
    try {
      const payload = {
        name: "My Dashboard",
        widgets: widgets.map((w) => ({
          i: w.i,
          type: w.type,
          x: w.x,
          y: w.y,
          w: w.w,
          h: w.h,
          minW: w.minW,
          minH: w.minH,
        })),
        is_default: true,
      };

      if (savedLayoutId) {
        const res = await fetch(`/api/crm/dashboard-layouts/${savedLayoutId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (json.success) {
          toast.success(t("crm.dashboard.constructor.saved"));
          setEditMode(false);
        } else {
          toast.error(t("common.error"));
        }
      } else {
        const res = await fetch("/api/crm/dashboard-layouts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (json.success) {
          setSavedLayoutId(json.data.id);
          toast.success(t("crm.dashboard.constructor.saved"));
          setEditMode(false);
        } else {
          toast.error(t("common.error"));
        }
      }
    } finally {
      setIsSavingLayout(false);
    }
  }, [widgets, savedLayoutId, t]);

  const handleAddWidget = useCallback((type: string) => {
    const id = `w${Date.now()}`;
    const defaults = widgetDefaults(type);
    // y = Infinity tells react-grid-layout's compactor to drop the widget
    // wherever it fits at the bottom of the existing layout.
    setWidgets((prev) => [
      ...prev,
      { i: id, type, x: 0, y: Infinity, w: defaults.w, h: defaults.h, minW: defaults.minW, minH: defaults.minH },
    ]);
  }, []);

  const handleLayoutChange = useCallback((next: Layout[]) => {
    setWidgets((prev) =>
      prev.map((w) => {
        const update = next.find((l) => l.i === w.i);
        return update ? { ...w, x: update.x, y: update.y, w: update.w, h: update.h } : w;
      }),
    );
  }, []);

  const handleRemoveWidget = useCallback((widgetId: string) => {
    setWidgets((prev) => prev.filter((w) => w.i !== widgetId));
  }, []);

  const handleResetLayout = useCallback(() => {
    setWidgets(DEFAULT_WIDGETS);
  }, []);

  const taskStatusLabels = getTaskStatusLabels();

  const taskStatusData = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach((task) => { counts[task.status] = (counts[task.status] || 0) + 1; });
    return Object.entries(counts).map(([status, count]) => ({
      name: taskStatusLabels[status] || status,
      value: count,
      color: TASK_STATUS_COLORS[status] || "#a1a1aa",
    }));
  }, [tasks, taskStatusLabels]);

  const upcomingTasks = useMemo(() =>
    tasks
      .filter((task) => task.status === "todo" || task.status === "in_progress")
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

  // Render one widget's body. Returns null for unknown types so an old saved
  // layout referencing a removed widget type degrades gracefully instead of
  // throwing.
  function renderWidgetBody(w: DashboardWidget): React.ReactNode {
    switch (w.type) {
      case "stat_openDeals":
        return <StatWidget href="/dashboard/deals" label={t("crm.dashboard.openDealsLabel")} value={crmStats?.openDeals ?? 0} subtitle={`$${(crmStats?.pipelineValue ?? 0).toLocaleString()} ${t("crm.dashboard.pipeline")}`} icon={Handshake} />;
      case "stat_wonThisMonth":
        return <StatWidget href="/dashboard/analytics" label={t("crm.dashboard.wonThisMonth")} value={crmStats?.wonValueThisMonth ?? 0} formattedValue={`$${(crmStats?.wonValueThisMonth ?? 0).toLocaleString()}`} subtitle={t("crm.dashboard.dealsClosed", { count: crmStats?.wonDealsThisMonth ?? 0 })} icon={DollarSign} trend={(crmStats?.wonDealsThisMonth ?? 0) > 0 ? { direction: "up", text: `${crmStats?.wonDealsThisMonth} successful` } : undefined} />;
      case "stat_contacts":
        return <StatWidget href="/dashboard/contacts" label={t("crm.dashboard.contactsLabel")} value={crmStats?.totalContacts ?? 0} subtitle={t("crm.dashboard.thisWeek", { count: crmStats?.newContactsThisWeek ?? 0 })} icon={Users} trend={(crmStats?.newContactsThisWeek ?? 0) > 0 ? { direction: "up", text: `+${crmStats?.newContactsThisWeek}` } : undefined} />;
      case "stat_tasksDue":
        return <StatWidget href="/dashboard/tasks" label={t("crm.dashboard.tasksDue")} value={crmStats?.tasksDueToday ?? 0} subtitle={crmStats?.overdueTasksCount ? t("crm.dashboard.overdue", { count: crmStats.overdueTasksCount }) : t("crm.dashboard.allOnTrack")} icon={CheckSquare} trend={crmStats?.overdueTasksCount ? { direction: "down", text: `${crmStats.overdueTasksCount} late` } : undefined} />;
      case "stat_winRate": {
        const winRateValue = crmStats && (crmStats.wonDealsThisMonth + (crmStats.totalDeals - crmStats.openDeals - crmStats.wonDealsThisMonth)) > 0
          ? Math.round((crmStats.wonDealsThisMonth / Math.max(crmStats.totalDeals - crmStats.openDeals, 1)) * 100) : 0;
        return <StatWidget href="/dashboard/analytics" label={t("crm.dashboard.winRate")} value={winRateValue} formattedValue={`${winRateValue}%`} subtitle={t("crm.dashboard.closedRatio")} icon={Target} />;
      }
      case "stat_forecast":
        return <StatWidget href="/dashboard/analytics" label={t("crm.dashboard.forecast")} value={crmStats?.weightedForecast ?? 0} formattedValue={`$${(crmStats?.weightedForecast ?? 0).toLocaleString()}`} subtitle={t("crm.dashboard.weightedPipeline")} icon={Zap} />;
      case "stat_organizations":
        return <StatWidget href="/dashboard/companies" label={t("crm.dashboard.organizations")} value={crmStats?.totalDeals ?? 0} subtitle={t("crm.dashboard.totalDeals")} icon={Building2} />;
      case "stat_avgDeal": {
        const avgDealValue = crmStats?.wonDealsThisMonth && crmStats?.wonValueThisMonth ? Math.round(crmStats.wonValueThisMonth / crmStats.wonDealsThisMonth) : 0;
        return <StatWidget href="/dashboard/analytics" label={t("crm.dashboard.avgDeal")} value={avgDealValue} formattedValue={`$${avgDealValue.toLocaleString()}`} subtitle={t("crm.dashboard.avgWonSize")} icon={BarChart3} />;
      }
      case "list_recentActivity":
        return (
          <ListWidget
            title={t("crm.dashboard.recent")}
            icon={Clock}
            href="/dashboard/activity"
            isEmpty={activities.length === 0}
            emptyIcon={Clock}
            emptyMessage={t("crm.dashboard.noActivityYet")}
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
        );
      case "list_aiInsights":
        return (
          <ListWidget
            title={t("crm.dashboard.aiInsights")}
            icon={Sparkles}
            href="/dashboard/chats"
            isEmpty={insights.length === 0}
            emptyIcon={Sparkles}
            emptyMessage={t("crm.dashboard.noInsightsYet")}
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
                      <p className="text-xs font-medium text-foreground">{t(insight.title, insight.params)}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{t(insight.description, insight.params)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ListWidget>
        );
      case "list_upcomingTasks":
        return (
          <ListWidget
            title={t("crm.dashboard.upcomingTasks")}
            icon={CheckSquare}
            href="/dashboard/tasks"
            isEmpty={upcomingTasks.length === 0}
            emptyIcon={CheckSquare}
            emptyMessage={t("crm.dashboard.noUpcomingTasks")}
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
                          ? new Date(task.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                          : t("crm.dashboard.noDueDate")}
                        {isOverdue && <span className="text-red-500 ml-1 font-medium">{t("crm.dashboard.overdueLabel")}</span>}
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
        );
      case "table_deals":
        return (
          <TableWidget
            title={t("crm.dashboard.dealsLabel")}
            icon={Handshake}
            href="/dashboard/deals"
            totalCount={deals.length}
            isEmpty={deals.length === 0}
            emptyIcon={Handshake}
            emptyMessage={t("crm.dashboard.noDealsYet")}
          >
            <div className="hidden lg:grid grid-cols-[1fr_100px_140px_80px_80px_70px] gap-2 px-4 pb-2 border-b border-border">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("crm.dashboard.name")}</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("crm.dashboard.stage")}</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("crm.dashboard.progress")}</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("crm.dashboard.value")}</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("crm.dashboard.close")}</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("crm.deals.fields.winPercent")}</span>
            </div>
            <div className="grid lg:hidden grid-cols-[1fr_80px_70px] gap-2 px-4 pb-2 border-b border-border">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("crm.dashboard.name")}</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("crm.dashboard.value")}</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("crm.deals.fields.winPercent")}</span>
            </div>

            <div>
              {deals.map((deal) => {
                const progress = dealProgress(deal);
                const stageColor = deal.deal_stages?.color || "#cbc3b4";
                const winProb = deal.ai_win_probability;
                return (
                  <React.Fragment key={deal.id}>
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
                            {deal.deal_stages?.name || "—"}
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
                          {deal.expected_close_date ? new Date(deal.expected_close_date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—"}
                        </span>
                        <span className={cn("text-xs font-semibold", winProb >= 70 ? "text-emerald-500" : winProb >= 40 ? "text-amber-500" : "text-red-400")}>
                          {winProb}%
                        </span>
                      </Link>
                    </div>
                    <Link
                      href={`/dashboard/deals/${deal.id}`}
                      className="grid lg:hidden grid-cols-[1fr_80px_70px] gap-2 px-4 py-2 hover:bg-muted/50 rounded-lg items-center transition-colors"
                    >
                      <div className="flex items-start gap-2 min-w-0">
                        <div className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ backgroundColor: stageColor, boxShadow: `0 0 6px ${stageColor}40` }} />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-medium text-foreground truncate block">{deal.title}</span>
                          <Badge variant="secondary" className="text-xs font-normal mt-1" style={{ borderColor: stageColor + "30", color: stageColor, backgroundColor: stageColor + "10" }}>
                            {deal.deal_stages?.name || "—"}
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
        );
      case "chart_revenue":
      case "chart_taskStatus":
        return (
          <DashboardCharts
            revenueTrend={revenueTrend}
            taskStatusData={taskStatusData}
            totalTasks={tasks.length}
          />
        );
      default:
        return null;
    }
  }

  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;

  // No active workspace or no CRM permissions
  const hasCrmAccess = currentWorkspace && can("contacts.read");
  if (!workspaceLoading && !hasCrmAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="mx-auto max-w-md text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">{t("crm.dashboard.noActiveTeam")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("crm.dashboard.noActiveTeamDesc")}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t("crm.dashboard.createTeam")}
            </Button>
            <Button variant="outline" onClick={() => setJoinDialogOpen(true)}>
              <Users className="w-4 h-4 mr-2" />
              {t("crm.dashboard.join")}
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
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <GreetingIcon className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">
                {greeting.text}, <span>{userName}</span>
              </h1>
              <p className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                {crmStats && ` · ${t("crm.dashboard.tasksDueToday", { count: crmStats.tasksDueToday })} · ${t("crm.dashboard.openDeals", { count: crmStats.openDeals })}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {editMode ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setShowWidgetPicker(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  {t("crm.dashboard.constructor.addWidget")}
                </Button>
                <Button variant="outline" size="sm" onClick={handleResetLayout}>
                  {t("crm.dashboard.constructor.reset")}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditMode(false)}>
                  <X className="w-3.5 h-3.5 mr-1.5" />
                  {t("common.cancel")}
                </Button>
                <Button size="sm" onClick={handleSaveLayout} disabled={isSavingLayout}>
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  {t("common.save")}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                  <Pencil className="w-3.5 h-3.5 mr-1.5" />
                  {t("crm.dashboard.constructor.editMode")}
                </Button>
                <Button variant="outline" size="sm" className="hidden sm:inline-flex" asChild>
                  <Link href="/dashboard/contacts">
                    <Users className="w-3.5 h-3.5 mr-2" />
                    {t("crm.contacts.title")}
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/pipeline">
                    <Kanban className="w-3.5 h-3.5 mr-2" />
                    {t("crm.pipeline.title")}
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Dashboard grid */}
      <div className="flex-1 overflow-auto p-4">
        <div className="mx-auto max-w-7xl">
          <DashboardGrid
            widgets={widgets}
            isEditMode={editMode}
            onLayoutChange={handleLayoutChange}
            rowHeight={60}
          >
            {widgets.map((w) => (
              <div key={w.i} className="h-full">
                <EditWrapper editMode={editMode} widgetId={w.i} onRemove={handleRemoveWidget}>
                  {renderWidgetBody(w)}
                </EditWrapper>
              </div>
            ))}
          </DashboardGrid>

          {!accountLoading && (account?.tier === "free" || !account?.tier) && usage && usage.percentUsed >= 80 && (
            <div className="mt-6 rounded-lg border border-landing-accent/30 bg-gradient-to-r from-landing-accent/5 via-landing-accent/10 to-landing-accent/5 p-4">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Sparkles className="w-4.5 h-4.5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {usage.percentUsed >= 100 ? t("crm.dashboard.usageLimitReached") : t("crm.dashboard.runningLow")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {usage.percentUsed >= 100 ? t("crm.dashboard.upgradeToContnue") : t("crm.dashboard.usedThisMonth", { percent: Math.round(usage.percentUsed) })}
                  </p>
                </div>
                <Button size="sm" asChild>
                  <Link href="/dashboard/account/billing">
                    {t("crm.dashboard.upgrade")}
                    <ArrowRight className="w-3.5 h-3.5 ml-2" />
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <WidgetPicker
        open={showWidgetPicker}
        onOpenChange={setShowWidgetPicker}
        onAdd={handleAddWidget}
        existingTypes={widgets.map(w => w.type)}
      />
      <UpgradeModal isOpen={isOpen} onClose={closeUpgradeModal} {...modalProps} />
    </div>
  );
}
