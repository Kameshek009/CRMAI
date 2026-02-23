"use client";

import { useState, useEffect } from "react";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { useTranslation } from "@/lib/i18n";
import { Loader2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { ForecastSummaryCard } from "@/components/forecast/forecast-summary-card";
import { ForecastChart } from "@/components/forecast/forecast-chart";
import { StageBreakdownTable } from "@/components/forecast/stage-breakdown-table";

interface ForecastData {
  stageBreakdown: Array<{
    id: string;
    name: string;
    color: string;
    position: number;
    dealCount: number;
    totalValue: number;
    winRate: number;
    weightedValue: number;
  }>;
  weightedPipeline: number;
  winRate: number;
  avgCycleTime: number;
  scenarios: Array<{ days: number; best: number; expected: number; worst: number }>;
  monthlyHistory: Array<{ month: string; revenue: number }>;
  openDealsCount: number;
  totalPipelineValue: number;
}

export function ForecastContent() {
  const { t } = useTranslation();
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/crm/stats/forecast");
        if (!res.ok) return;
        const json = await res.json();
        if (json.success) setData(json.data);
      } catch {
        toast.error(t("common.failed"));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <PageContainer>
        <PageHeader title={t("crm.forecast.title")} description={t("crm.forecast.description")} />
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </PageContainer>
    );
  }

  if (!data) {
    return (
      <PageContainer>
        <PageHeader title={t("crm.forecast.title")} description={t("crm.forecast.description")} />
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <TrendingUp className="size-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">{t("crm.forecast.noData")}</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader title={t("crm.forecast.title")} description={t("crm.forecast.description")} />

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {data.scenarios.map((scenario) => (
          <ForecastSummaryCard key={scenario.days} scenario={scenario} />
        ))}
      </div>

      {/* Insights row */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">{t("crm.forecast.pipelineValue")}</p>
          <p className="text-xl font-bold mt-1">${(data.totalPipelineValue / 1000).toFixed(1)}k</p>
          <p className="text-[10px] text-muted-foreground">{data.openDealsCount} {t("crm.forecast.openDeals")}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">{t("crm.forecast.weightedPipeline")}</p>
          <p className="text-xl font-bold mt-1">${(data.weightedPipeline / 1000).toFixed(1)}k</p>
          <p className="text-[10px] text-muted-foreground">{t("crm.forecast.probabilityAdjusted")}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">{t("crm.forecast.winRate")}</p>
          <p className="text-xl font-bold mt-1">{data.winRate}%</p>
          <p className="text-[10px] text-muted-foreground">{t("crm.forecast.historicalAvg")}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">{t("crm.forecast.avgCycle")}</p>
          <p className="text-xl font-bold mt-1">{data.avgCycleTime} {t("crm.forecast.days")}</p>
          <p className="text-[10px] text-muted-foreground">{t("crm.forecast.timeToClose")}</p>
        </div>
      </div>

      {/* Revenue chart */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold mb-4">{t("crm.forecast.revenueHistory")}</h3>
        <ForecastChart data={data.monthlyHistory} />
      </div>

      {/* Stage breakdown */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold mb-4">{t("crm.forecast.stageBreakdown")}</h3>
        <StageBreakdownTable stages={data.stageBreakdown} />
      </div>
    </PageContainer>
  );
}
