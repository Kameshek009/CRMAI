"use client";

import { memo } from "react";
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
import { TrendingUp, DollarSign, Kanban, CheckSquare } from "lucide-react";
import { ChartWidget } from "@/components/dashboard/widgets/chart-widget";
import { useTranslation } from "@/lib/i18n";

interface TaskStatusEntry {
  name: string;
  value: number;
  color: string;
}

interface RevenueTrendEntry {
  date: string;
  revenue: number;
  cumulative: number;
}

interface DashboardChartsProps {
  revenueTrend: RevenueTrendEntry[];
  taskStatusData: TaskStatusEntry[];
  totalTasks: number;
}

export const DashboardCharts = memo(function DashboardCharts({ revenueTrend, taskStatusData, totalTasks }: DashboardChartsProps) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ChartWidget
        title={t("crm.dashboard.charts.revenueTrend")}
        icon={TrendingUp}
        isEmpty={revenueTrend.length === 0 || revenueTrend.every((d) => d.revenue === 0)}
        emptyIcon={DollarSign}
        emptyMessage={t("crm.dashboard.charts.noRevenueData")}
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
                formatter={(value: number) => [`$${value.toLocaleString()}`, t("crm.dashboard.charts.revenueLabel")]}
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
        title={t("crm.dashboard.charts.workloadByStatus")}
        icon={Kanban}
        isEmpty={taskStatusData.length === 0}
        emptyIcon={CheckSquare}
        emptyMessage={t("crm.dashboard.charts.noTasksData")}
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
                      style={{ width: `${(entry.value / totalTasks) * 100}%`, backgroundColor: entry.color }}
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
  );
});
