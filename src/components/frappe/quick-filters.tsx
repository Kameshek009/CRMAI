"use client";

import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

export interface QuickFilterOption {
  value: string;
  label: string;
  count?: number;
}

interface QuickFiltersProps {
  options: QuickFilterOption[];
  activeValue: string | null;
  onChange: (value: string | null) => void;
  className?: string;
}

export function QuickFilters({ options, activeValue, onChange, className }: QuickFiltersProps) {
  const { t } = useTranslation();

  return (
    <div className={cn("flex items-center gap-1.5 flex-wrap", className)}>
      <button
        type="button"
        onClick={() => onChange(null)}
        className={cn(
          "rounded-full px-3 py-1 text-xs font-medium transition-colors",
          activeValue === null
            ? "bg-foreground text-background"
            : "bg-muted text-muted-foreground hover:text-foreground"
        )}
      >
        {t("crm.viewControls.all")}
      </button>
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(activeValue === opt.value ? null : opt.value)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
            activeValue === opt.value
              ? "bg-foreground text-background"
              : "bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          {opt.label}
          {opt.count !== undefined && (
            <span className="ml-1 opacity-70">{opt.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
