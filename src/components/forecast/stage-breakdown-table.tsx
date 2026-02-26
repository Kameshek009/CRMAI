"use client";

import { memo } from "react";
import { useTranslation } from "@/lib/i18n";

interface StageData {
  id: string;
  name: string;
  color: string;
  position: number;
  dealCount: number;
  totalValue: number;
  winRate: number;
  weightedValue: number;
}

function formatMoney(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${value}`;
}

export const StageBreakdownTable = memo(function StageBreakdownTable({ stages }: { stages: StageData[] }) {
  const { t } = useTranslation();

  if (stages.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("crm.forecast.noStages")}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="px-3 py-2 text-xs font-medium text-muted-foreground text-left">{t("crm.forecast.stage")}</th>
            <th className="px-3 py-2 text-xs font-medium text-muted-foreground text-right">{t("crm.forecast.deals")}</th>
            <th className="px-3 py-2 text-xs font-medium text-muted-foreground text-right">{t("crm.forecast.value")}</th>
            <th className="px-3 py-2 text-xs font-medium text-muted-foreground text-right">{t("crm.forecast.stageWinRate")}</th>
            <th className="px-3 py-2 text-xs font-medium text-muted-foreground text-right">{t("crm.forecast.weighted")}</th>
          </tr>
        </thead>
        <tbody>
          {stages.map((stage) => (
            <tr key={stage.id} className="border-b border-border last:border-0">
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: stage.color }}
                  />
                  <span className="font-medium">{stage.name}</span>
                </div>
              </td>
              <td className="px-3 py-2 text-right text-muted-foreground">{stage.dealCount}</td>
              <td className="px-3 py-2 text-right">{formatMoney(stage.totalValue)}</td>
              <td className="px-3 py-2 text-right text-muted-foreground">{stage.winRate}%</td>
              <td className="px-3 py-2 text-right font-medium">{formatMoney(stage.weightedValue)}</td>
            </tr>
          ))}
          <tr className="bg-muted/30">
            <td className="px-3 py-2 font-semibold">{t("crm.forecast.total")}</td>
            <td className="px-3 py-2 text-right font-semibold">{stages.reduce((s, st) => s + st.dealCount, 0)}</td>
            <td className="px-3 py-2 text-right font-semibold">{formatMoney(stages.reduce((s, st) => s + st.totalValue, 0))}</td>
            <td className="px-3 py-2" />
            <td className="px-3 py-2 text-right font-semibold">{formatMoney(stages.reduce((s, st) => s + st.weightedValue, 0))}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
});
