"use client";

import { useState, useEffect } from "react";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "recharts";
import { DollarSign, Users, Handshake, CheckSquare, TrendingUp, Sparkles, AlertCircle, Info } from "lucide-react";
import type { CrmStats, AIInsight } from "@/types/crm";

interface PipelineColumn {
  stage: { name: string; color: string; is_won: boolean; is_lost: boolean };
  totalValue: number;
  count: number;
}

export function AnalyticsContent() {
  const [stats, setStats] = useState<CrmStats | null>(null);
  const [pipeline, setPipeline] = useState<PipelineColumn[]>([]);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/crm/stats").then((r) => r.json()),
      fetch("/api/crm/pipeline").then((r) => r.json()),
      fetch("/api/crm/ai/insights").then((r) => r.json()),
    ]).then(([statsRes, pipelineRes, insightsRes]) => {
      if (statsRes.success) setStats(statsRes.data);
      if (pipelineRes.success) setPipeline(pipelineRes.data.columns);
      if (insightsRes.success) setInsights(insightsRes.data);
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return (
      <PageContainer>
        <PageHeader title="Analytics" description="CRM performance overview" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-80" />
      </PageContainer>
    );
  }

  const funnelData = pipeline
    .filter((c) => !c.stage.is_won && !c.stage.is_lost)
    .map((c) => ({
      name: c.stage.name,
      deals: c.count,
      value: c.totalValue,
      fill: c.stage.color,
    }));

  const statusData = [
    { name: "Open", value: stats?.openDeals || 0, fill: "#6366f1" },
    { name: "Won", value: stats?.wonDealsThisMonth || 0, fill: "#22c55e" },
  ];

  const insightIcons: Record<string, typeof Info> = {
    warning: AlertCircle,
    opportunity: TrendingUp,
    action: Sparkles,
    info: Info,
  };

  return (
    <PageContainer>
      <PageHeader title="Analytics" description="CRM performance overview" />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalContacts || 0}</div>
            <p className="text-xs text-muted-foreground">+{stats?.newContactsThisWeek || 0} this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Open Deals</CardTitle>
            <Handshake className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.openDeals || 0}</div>
            <p className="text-xs text-muted-foreground">${(stats?.pipelineValue || 0).toLocaleString()} pipeline</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Won This Month</CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(stats?.wonValueThisMonth || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{stats?.wonDealsThisMonth || 0} deals closed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tasks</CardTitle>
            <CheckSquare className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.tasksDueToday || 0} due today</div>
            <p className="text-xs text-muted-foreground">{stats?.overdueTasksCount || 0} overdue</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pipeline Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pipeline by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={funnelData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => [`$${value.toLocaleString()}`, "Value"]}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {funnelData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Deal Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Deal Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      {insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="size-4" />
              AI Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.map((insight) => {
                const Icon = insightIcons[insight.type] || Info;
                return (
                  <div key={insight.id} className="flex items-start gap-3">
                    <Icon className="size-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">{insight.title}</p>
                      <p className="text-sm text-muted-foreground">{insight.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
