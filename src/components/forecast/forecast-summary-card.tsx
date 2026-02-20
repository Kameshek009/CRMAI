"use client";

import { useTranslation } from "@/lib/i18n";

function formatMoney(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${value}`;
}

export function ForecastSummaryCard({
  scenario,
}: {
  scenario: { days: number; best: number; expected: number; worst: number };
}) {
  const { t } = useTranslation();

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        {t("crm.forecast.nextDays", { days: scenario.days })}
      </p>
      <p className="text-2xl font-bold">{formatMoney(scenario.expected)}</p>
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="text-emerald-600">{t("crm.forecast.best")}: {formatMoney(scenario.best)}</span>
        <span className="text-red-500">{t("crm.forecast.worst")}: {formatMoney(scenario.worst)}</span>
      </div>
    </div>
  );
}
