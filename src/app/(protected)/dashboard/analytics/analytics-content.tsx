"use client";

import { useState, useEffect } from "react";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import {
  DollarSign,
  Users,
  Handshake,
  CheckSquare,
  TrendingUp,
  Sparkles,
  AlertCircle,
  Info,
  Zap,
  Timer,
  Target,
  BarChart3,
  Activity,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  type LucideIcon,
} from "lucide-react";
import type { AIInsight } from "@/types/crm";
import { useTranslation } from "@/lib/i18n";

interface AnalyticsData {
  stageConversion: { name: string; color: string; position: number; isWon: boolean; isLost: boolean; count: number; value: number }[];
  winRate: number;
  avgWonValue: number;
  avgLostValue: number;
  avgDaysToClose: number;
  totalWonValue: number;
  totalLostValue: number;
  wonCount: number;
  lostCount: number;
  openCount: number;
  pipelineValue: number;
  weightedForecast: number;
  salesVelocity: number;
  topDeals: { id: string; title: string; value: number; probability: number; stage: string; stageColor: string }[];
  monthlyRevenue: { month: string; revenue: number; deals: number }[];
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  revenueGrowth: number;
  contactsByStatus: { status: string; count: number }[];
  contactsBySource: { source: string; count: number }[];
  totalContacts: number;
  avgEngagement: number;
  activityByType: { type: string; count: number }[];
  dailyActivity: { date: string; count: number }[];
  totalActivities: number;
  tasksByStatus: { status: string; count: number }[];
  tasksByPriority: { priority: string; count: number }[];
  tasksByType: { type: string; count: number }[];
  completedThisWeek: number;
  totalTasks: number;
  healthBuckets: { excellent: number; good: number; fair: number; poor: number };
  companiesByIndustry: { industry: string; count: number }[];
  totalCompanies: number;
  leadConversionFunnel: { stage: string; count: number; color: string }[];
}

const STATUS_COLORS: Record<string, string> = {
  lead: "#f4a261",
  active: "#22c55e",
  inactive: "#a1a1aa",
  churned: "#ef4444",
};

const TASK_STATUS_COLORS: Record<string, string> = {
  todo: "#f4a261",
  in_progress: "#e76f51",
  done: "#22c55e",
  cancelled: "#a1a1aa",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "#f9c49a",
  medium: "#f4a261",
  high: "#e76f51",
  urgent: "#ef4444",
};

const HEALTH_COLORS: Record<string, string> = {
  excellent: "#22c55e",
  good: "#f4a261",
  fair: "#e76f51",
  poor: "#ef4444",
};

function getActivityLabels(t: (key: string) => string): Record<string, string> {
  return {
    deal_created: t("crm.analytics.activityDealsCreated"),
    deal_stage_changed: t("crm.analytics.activityStageChanges"),
    deal_won: t("crm.analytics.activityDealsWon"),
    deal_lost: t("crm.analytics.activityDealsLost"),
    contact_created: t("crm.analytics.activityContactsAdded"),
    task_completed: t("crm.analytics.activityTasksDone"),
    note: t("crm.analytics.activityNotes"),
    call: t("crm.analytics.activityCalls"),
    email: t("crm.analytics.activityEmails"),
    meeting: t("crm.analytics.activityMeetings"),
    import: t("crm.analytics.activityImports"),
  };
}

function MetricCard({
  label,
  value,
  subtitle,
  icon: Icon,
  gradient,
  trend,
}: {
  label: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  gradient: string;
  trend?: { direction: "up" | "down"; text: string };
}) {
  return (
    <div>
      <Card className="glass-card gradient-border-card stat-card-hover">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", gradient)}>
              <Icon className="w-4 h-4 text-landing-accent-foreground" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight">{value}</div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-muted-foreground">{subtitle}</p>
            {trend && (
              <div className={cn(
                "flex items-center gap-1 text-xs font-medium",
                trend.direction === "up" ? "text-emerald-500" : "text-red-500"
              )}>
                {trend.direction === "up" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {trend.text}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function AnalyticsContent() {
  const { t } = useTranslation();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/crm/stats/analytics").then((r) => r.json()),
      fetch("/api/crm/ai/insights").then((r) => r.json()).catch(() => ({ success: false })),
    ]).then(([analyticsRes, insightsRes]) => {
      if (analyticsRes.success) {
        setData(analyticsRes.data);
      } else {
        setError(analyticsRes.error || t("crm.analytics.errorLoad"));
      }
      if (insightsRes.success) setInsights(insightsRes.data || []);
      setIsLoading(false);
    }).catch(() => {
      setError(t("crm.analytics.errorLoadData"));
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return (
      <PageContainer>
        <PageHeader title={t("crm.analytics.title")} description={t("crm.analytics.description")} />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-[110px] rounded-xl" />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[320px] rounded-xl" />)}
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <PageHeader title={t("crm.analytics.title")} description={t("crm.analytics.description")} />
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle className="size-10 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">{t("crm.analytics.errorLoad")}</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  if (!data) return null;

  const contactStatusData = (data.contactsByStatus || []).map((c) => ({
    name: c.status.charAt(0).toUpperCase() + c.status.slice(1),
    value: c.count,
    fill: STATUS_COLORS[c.status] || "#a1a1aa",
  }));

  const taskStatusData = (data.tasksByStatus || []).map((t) => ({
    name: t.status === "in_progress" ? "In Progress" : t.status.charAt(0).toUpperCase() + t.status.slice(1),
    value: t.count,
    fill: TASK_STATUS_COLORS[t.status] || "#a1a1aa",
  }));

  const taskPriorityData = (data.tasksByPriority || []).map((t) => ({
    name: t.priority.charAt(0).toUpperCase() + t.priority.slice(1),
    value: t.count,
    fill: PRIORITY_COLORS[t.priority] || "#a1a1aa",
  }));

  const hb = data.healthBuckets || { excellent: 0, good: 0, fair: 0, poor: 0 };
  const healthData = [
    { name: t("crm.analytics.healthExcellent"), value: hb.excellent, fill: HEALTH_COLORS.excellent },
    { name: t("crm.analytics.healthGood"), value: hb.good, fill: HEALTH_COLORS.good },
    { name: t("crm.analytics.healthFair"), value: hb.fair, fill: HEALTH_COLORS.fair },
    { name: t("crm.analytics.healthPoor"), value: hb.poor, fill: HEALTH_COLORS.poor },
  ].filter((d) => d.value > 0);

  const funnelData = (data.stageConversion || []).filter((s) => !s.isWon && !s.isLost);

  const activityLabels = getActivityLabels(t);
  const activityData = (data.activityByType || [])
    .map((a) => ({ name: activityLabels[a.type] || a.type, count: a.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const insightIcons: Record<string, LucideIcon> = {
    warning: AlertCircle,
    opportunity: TrendingUp,
    action: Sparkles,
    info: Info,
  };

  const insightColors: Record<string, string> = {
    warning: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    opportunity: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    action: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    info: "text-muted-foreground bg-muted border-border",
  };

  return (
    <PageContainer>
      <PageHeader title={t("crm.analytics.title")} description={t("crm.analytics.description")} />

      {/* Top metrics row - 8 cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label={t("crm.analytics.winRate")}
          value={`${data.winRate}%`}
          subtitle={`${data.wonCount}S / ${data.lostCount}C`}
          icon={Target}
          gradient="bg-gradient-to-br from-landing-accent to-orange-500"
        />
        <MetricCard
          label={t("crm.analytics.pipelineValue")}
          value={`$${data.pipelineValue.toLocaleString()}`}
          subtitle={t("crm.analytics.openDeals", { count: data.openCount })}
          icon={Handshake}
          gradient="bg-gradient-to-br from-landing-accent to-orange-500"
        />
        <MetricCard
          label={t("crm.analytics.thisMonth")}
          value={`$${data.thisMonthRevenue.toLocaleString()}`}
          subtitle={data.revenueGrowth >= 0 ? t("crm.analytics.revenue") : t("crm.analytics.revenueDeclined")}
          icon={DollarSign}
          gradient="bg-gradient-to-br from-landing-accent to-landing-accent"
          trend={{
            direction: data.revenueGrowth >= 0 ? "up" : "down",
            text: t("crm.analytics.vsLastMonth", { percent: Math.abs(data.revenueGrowth) }),
          }}
        />
        <MetricCard
          label={t("crm.analytics.forecast")}
          value={`$${data.weightedForecast.toLocaleString()}`}
          subtitle={t("crm.analytics.weightedPipeline")}
          icon={TrendingUp}
          gradient="bg-gradient-to-br from-orange-500 to-landing-accent"
        />
        <MetricCard
          label={t("crm.analytics.avgDealSize")}
          value={`$${data.avgWonValue.toLocaleString()}`}
          subtitle={t("crm.analytics.wonDealsAverage")}
          icon={BarChart3}
          gradient="bg-gradient-to-br from-landing-accent to-landing-accent"
        />
        <MetricCard
          label={t("crm.analytics.salesVelocity")}
          value={`$${data.salesVelocity.toLocaleString()}`}
          subtitle={t("crm.analytics.perDayPotential")}
          icon={Zap}
          gradient="bg-gradient-to-br from-orange-500 to-landing-accent"
        />
        <MetricCard
          label={t("crm.analytics.avgCloseTime")}
          value={`${data.avgDaysToClose}d`}
          subtitle={t("crm.analytics.daysToClose")}
          icon={Timer}
          gradient="bg-gradient-to-br from-landing-accent to-orange-500"
        />
        <MetricCard
          label={t("crm.analytics.engagement")}
          value={`${data.avgEngagement}/100`}
          subtitle={t("crm.analytics.contactsCount", { count: data.totalContacts })}
          icon={Users}
          gradient="bg-gradient-to-br from-landing-accent to-landing-accent"
        />
      </div>

      {/* Charts grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Monthly Revenue Comparison */}
        <div>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-gradient-to-br from-landing-accent to-orange-500 flex items-center justify-center">
                  <DollarSign className="w-3 h-3 text-landing-accent-foreground" />
                </div>
                {t("crm.analytics.monthlyRevenue")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.monthlyRevenue || []}>
                    <defs>
                      <linearGradient id="revenueBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f4a261" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#f4a261" stopOpacity={0.4} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.5} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "12px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}
                      formatter={(value: number) => [`$${value.toLocaleString()}`, t("crm.analytics.revenue")]}
                    />
                    <Bar dataKey="revenue" fill="url(#revenueBarGrad)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pipeline Funnel */}
        <div>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-gradient-to-br from-landing-accent to-orange-500 flex items-center justify-center">
                  <Handshake className="w-3 h-3 text-landing-accent-foreground" />
                </div>
                {t("crm.analytics.pipelineFunnel")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {funnelData.length === 0 ? (
                <div className="text-center py-12">
                  <Handshake className="w-10 h-10 mx-auto text-muted-foreground/20 mb-4" />
                  <p className="text-sm text-muted-foreground">{t("crm.analytics.noPipelineStages")}</p>
                </div>
              ) : (
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={funnelData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.5} horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "12px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}
                        formatter={(value: number, name: string) => {
                          if (name === "value") return [`$${value.toLocaleString()}`, t("crm.analytics.value")];
                          return [value, t("crm.analytics.deals")];
                        }}
                      />
                      <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                        {funnelData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} fillOpacity={0.8} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Daily Activity Trend */}
        <div>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-gradient-to-br from-landing-accent to-orange-500 flex items-center justify-center">
                  <Activity className="w-3 h-3 text-landing-accent-foreground" />
                </div>
                {t("crm.analytics.activityTrend")}
                <Badge variant="secondary" className="text-xs ml-auto">{data.totalActivities} {t("crm.analytics.total")}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.dailyActivity || []}>
                    <defs>
                      <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f4a261" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#f4a261" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.5} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                      tickFormatter={(d) => new Date(d).toLocaleDateString("en-US", { day: "numeric" })}
                      interval="preserveStartEnd"
                      axisLine={false} tickLine={false}
                    />
                    <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "12px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}
                      labelFormatter={(label) => new Date(String(label)).toLocaleDateString("en-US", { month: "long", day: "numeric" })}
                    />
                    <Area type="monotone" dataKey="count" stroke="#f4a261" strokeWidth={2} fill="url(#activityGradient)" activeDot={{ r: 4, fill: "#f4a261", strokeWidth: 2, stroke: "var(--card)" }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Win/Loss Analysis */}
        <div>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-gradient-to-br from-orange-500 to-landing-accent flex items-center justify-center">
                  <Target className="w-3 h-3 text-landing-accent-foreground" />
                </div>
                {t("crm.analytics.winLossAnalysis")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="text-xs text-emerald-600 font-medium mb-1">{t("crm.analytics.wonDeals")}</div>
                  <div className="text-xl font-bold text-emerald-600">{data.wonCount}</div>
                  <div className="text-xs text-emerald-600/70">${data.totalWonValue.toLocaleString()} {t("crm.analytics.total")}</div>
                  <div className="text-xs text-emerald-600/60 mt-1">{t("crm.analytics.avg")}: ${data.avgWonValue.toLocaleString()}</div>
                </div>
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                  <div className="text-xs text-red-500 font-medium mb-1">{t("crm.analytics.lostDeals")}</div>
                  <div className="text-xl font-bold text-red-500">{data.lostCount}</div>
                  <div className="text-xs text-red-500/70">${data.totalLostValue.toLocaleString()} {t("crm.analytics.total")}</div>
                  <div className="text-xs text-red-500/60 mt-1">{t("crm.analytics.avg")}: ${data.avgLostValue.toLocaleString()}</div>
                </div>
              </div>
              {/* Win rate bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{t("crm.analytics.winRate")}</span>
                  <span className="font-bold text-lg">{data.winRate}%</span>
                </div>
                <div className="h-3 rounded-full bg-muted overflow-hidden flex">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-l-full transition-all duration-700"
                    style={{ width: `${data.winRate}%` }}
                  />
                  <div
                    className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-r-full transition-all duration-700"
                    style={{ width: `${100 - data.winRate}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{t("crm.analytics.won")}: {data.wonCount}</span>
                  <span>{t("crm.analytics.lost")}: {data.lostCount}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contact Distribution */}
        <div>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-gradient-to-br from-landing-accent to-landing-accent flex items-center justify-center">
                  <Users className="w-3 h-3 text-landing-accent-foreground" />
                </div>
                {t("crm.analytics.contactDistribution")}
                <Badge variant="secondary" className="text-xs ml-auto">{data.totalContacts} {t("crm.analytics.total")}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {contactStatusData.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-10 h-10 mx-auto text-muted-foreground/20 mb-4" />
                  <p className="text-sm text-muted-foreground">{t("crm.analytics.noContacts")}</p>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="w-[160px] h-[200px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={contactStatusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value" stroke="none" animationDuration={800}>
                          {contactStatusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "12px" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-4">
                    {contactStatusData.map((entry) => (
                      <div key={entry.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.fill }} />
                          <span className="text-xs">{entry.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${(entry.value / data.totalContacts) * 100}%`, backgroundColor: entry.fill }} />
                          </div>
                          <span className="text-xs font-semibold w-8 text-right">{entry.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Task Breakdown */}
        <div>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-gradient-to-br from-landing-accent to-orange-500 flex items-center justify-center">
                  <CheckSquare className="w-3 h-3 text-landing-accent-foreground" />
                </div>
                {t("crm.analytics.taskBreakdown")}
                <Badge variant="secondary" className="text-xs ml-auto">{t("crm.analytics.doneThisWeek", { count: data.completedThisWeek })}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-4">
                {/* By Status */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{t("crm.analytics.byStatus")}</p>
                  <div className="space-y-2">
                    {taskStatusData.map((entry) => (
                      <div key={entry.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />
                          <span className="text-xs">{entry.name}</span>
                        </div>
                        <span className="text-xs font-semibold">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* By Priority */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{t("crm.analytics.byPriority")}</p>
                  <div className="space-y-2">
                    {taskPriorityData.map((entry) => (
                      <div key={entry.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />
                          <span className="text-xs">{entry.name}</span>
                        </div>
                        <span className="text-xs font-semibold">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity by Type */}
        <div>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-gradient-to-br from-orange-500 to-landing-accent flex items-center justify-center">
                  <Zap className="w-3 h-3 text-landing-accent-foreground" />
                </div>
                {t("crm.analytics.activityBreakdown")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {activityData.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="w-10 h-10 mx-auto text-muted-foreground/20 mb-4" />
                  <p className="text-sm text-muted-foreground">{t("crm.analytics.noRecentActivity")}</p>
                </div>
              ) : (
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={activityData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.5} horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "12px" }} />
                      <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                        {activityData.map((_, i) => (
                          <Cell key={i} fill={`hsl(${20 + i * 8}, 80%, ${55 + i * 3}%)`} fillOpacity={0.8} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Company Health */}
        <div>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-gradient-to-br from-landing-accent to-orange-500 flex items-center justify-center">
                  <Building2 className="w-3 h-3 text-landing-accent-foreground" />
                </div>
                {t("crm.analytics.companyHealth")}
                <Badge variant="secondary" className="text-xs ml-auto">{t("crm.analytics.companiesCount", { count: data.totalCompanies })}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {healthData.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="w-10 h-10 mx-auto text-muted-foreground/20 mb-4" />
                  <p className="text-sm text-muted-foreground">{t("crm.analytics.noCompanies")}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-[140px] h-[160px] shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={healthData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value" stroke="none">
                            {healthData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", fontSize: "12px" }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-2">
                      {healthData.map((entry) => (
                        <div key={entry.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.fill }} />
                            <span className="text-xs">{entry.name}</span>
                          </div>
                          <span className="text-xs font-semibold">{entry.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Industry breakdown */}
                  {(data.companiesByIndustry || []).length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{t("crm.analytics.topIndustries")}</p>
                      <div className="flex flex-wrap gap-2">
                        {(data.companiesByIndustry || []).slice(0, 6).map((ind) => (
                          <Badge key={ind.industry} variant="secondary" className="text-xs">
                            {ind.industry}: {ind.count}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Deals */}
        <div>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-gradient-to-br from-landing-accent to-orange-500 flex items-center justify-center">
                  <TrendingUp className="w-3 h-3 text-landing-accent-foreground" />
                </div>
                {t("crm.analytics.topOpenDeals")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {(data.topDeals || []).length === 0 ? (
                <div className="text-center py-12">
                  <Handshake className="w-10 h-10 mx-auto text-muted-foreground/20 mb-4" />
                  <p className="text-sm text-muted-foreground">{t("crm.analytics.noOpenDeals")}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(data.topDeals || []).map((deal, i) => (
                    <div key={deal.id} className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold">{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{deal.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs" style={{ color: deal.stageColor, borderColor: deal.stageColor + "30", backgroundColor: deal.stageColor + "10" }}>
                            {deal.stage}
                          </Badge>
                          <span className={cn("text-xs font-medium", deal.probability >= 70 ? "text-emerald-500" : deal.probability >= 40 ? "text-amber-500" : "text-red-400")}>
                            {deal.probability}% {t("crm.analytics.win")}
                          </span>
                        </div>
                      </div>
                      <span className="text-sm font-bold">${deal.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Contact Sources */}
        <div>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-gradient-to-br from-landing-accent to-landing-accent flex items-center justify-center">
                  <Users className="w-3 h-3 text-landing-accent-foreground" />
                </div>
                {t("crm.analytics.contactSources")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {(data.contactsBySource || []).length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-10 h-10 mx-auto text-muted-foreground/20 mb-4" />
                  <p className="text-sm text-muted-foreground">{t("crm.analytics.noSourceData")}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(data.contactsBySource || []).sort((a, b) => b.count - a.count).slice(0, 8).map((source, i) => {
                    const pct = data.totalContacts > 0 ? Math.round((source.count / data.totalContacts) * 100) : 0;
                    return (
                      <div key={source.source} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="capitalize">{source.source}</span>
                          <span className="text-muted-foreground">{source.count} ({pct}%)</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${pct}%`,
                              background: `hsl(${20 + i * 8}, 75%, ${55 + i * 3}%)`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Lead Conversion Funnel — full width */}
      {(data.leadConversionFunnel || []).some((s) => s.count > 0) && (
        <div>
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-gradient-to-br from-landing-accent to-orange-500 flex items-center justify-center">
                  <Filter className="w-3 h-3 text-landing-accent-foreground" />
                </div>
                {t("crm.analytics.leadConversionFunnel")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {(data.leadConversionFunnel || []).map((step, i) => {
                  const maxCount = Math.max(...(data.leadConversionFunnel || []).map((s) => s.count), 1);
                  const pct = Math.round((step.count / maxCount) * 100);
                  const prevCount = i > 0 ? (data.leadConversionFunnel || [])[i - 1].count : 0;
                  const convRate = i > 0 && prevCount > 0 ? Math.round((step.count / prevCount) * 100) : null;
                  return (
                    <div key={step.stage} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{step.stage}</span>
                          <span className="text-muted-foreground">{step.count}</span>
                        </div>
                        {convRate !== null && (
                          <span className="text-xs text-muted-foreground">{convRate}% {t("crm.analytics.fromPrev")}</span>
                        )}
                      </div>
                      <div className="h-8 rounded-lg bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-lg transition-all duration-700 flex items-center px-3"
                          style={{ width: `${Math.max(pct, 4)}%`, backgroundColor: step.color }}
                        >
                          {pct > 15 && <span className="text-xs font-semibold text-white">{step.count}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Insights */}
      {insights.length > 0 && (
        <div>
          <Card className="glass-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-gradient-to-br from-landing-accent to-orange-500 flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-landing-accent-foreground" />
                </div>
                {t("crm.analytics.aiInsights")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid gap-4 sm:grid-cols-2">
                {insights.map((insight) => {
                  const Icon = insightIcons[insight.type] || Info;
                  const color = insightColors[insight.type] || insightColors.info;
                  return (
                    <div key={insight.id} className={cn("flex items-start gap-2 p-4 rounded-xl border", color)}>
                      <Icon className="w-4 h-4 mt-1 shrink-0" />
                      <div>
                        <p className="text-xs font-medium">{insight.title}</p>
                        <p className="text-xs opacity-70 mt-1">{insight.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageContainer>
  );
}
