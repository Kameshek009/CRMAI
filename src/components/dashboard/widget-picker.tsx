"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "@/lib/i18n";
import {
  Handshake,
  DollarSign,
  Users,
  CheckSquare,
  Target,
  Zap,
  Building2,
  BarChart3,
  Clock,
  Sparkles,
  TrendingUp,
  Kanban,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface WidgetDefinition {
  type: string;
  labelKey: string;
  icon: LucideIcon;
  defaultW: number;
  defaultH: number;
  category: "stat" | "list" | "table" | "chart";
}

export const WIDGET_CATALOG: WidgetDefinition[] = [
  // Stats
  { type: "stat_openDeals", labelKey: "crm.dashboard.openDealsLabel", icon: Handshake, defaultW: 1, defaultH: 1, category: "stat" },
  { type: "stat_wonThisMonth", labelKey: "crm.dashboard.wonThisMonth", icon: DollarSign, defaultW: 1, defaultH: 1, category: "stat" },
  { type: "stat_contacts", labelKey: "crm.dashboard.contactsLabel", icon: Users, defaultW: 1, defaultH: 1, category: "stat" },
  { type: "stat_tasksDue", labelKey: "crm.dashboard.tasksDue", icon: CheckSquare, defaultW: 1, defaultH: 1, category: "stat" },
  { type: "stat_winRate", labelKey: "crm.dashboard.winRate", icon: Target, defaultW: 1, defaultH: 1, category: "stat" },
  { type: "stat_forecast", labelKey: "crm.dashboard.forecast", icon: Zap, defaultW: 1, defaultH: 1, category: "stat" },
  { type: "stat_organizations", labelKey: "crm.dashboard.organizations", icon: Building2, defaultW: 1, defaultH: 1, category: "stat" },
  { type: "stat_avgDeal", labelKey: "crm.dashboard.avgDeal", icon: BarChart3, defaultW: 1, defaultH: 1, category: "stat" },

  // Lists
  { type: "list_recentActivity", labelKey: "crm.dashboard.recent", icon: Clock, defaultW: 1, defaultH: 2, category: "list" },
  { type: "list_aiInsights", labelKey: "crm.dashboard.aiInsights", icon: Sparkles, defaultW: 1, defaultH: 2, category: "list" },
  { type: "list_upcomingTasks", labelKey: "crm.dashboard.upcomingTasks", icon: CheckSquare, defaultW: 1, defaultH: 2, category: "list" },

  // Table
  { type: "table_deals", labelKey: "crm.dashboard.dealsLabel", icon: Handshake, defaultW: 4, defaultH: 2, category: "table" },

  // Charts
  { type: "chart_revenue", labelKey: "crm.dashboard.constructor.revenueChart", icon: TrendingUp, defaultW: 2, defaultH: 2, category: "chart" },
  { type: "chart_taskStatus", labelKey: "crm.dashboard.constructor.taskChart", icon: CheckSquare, defaultW: 2, defaultH: 2, category: "chart" },

  // Pipeline mini
  { type: "pipeline_mini", labelKey: "crm.dashboard.constructor.pipelineMini", icon: Kanban, defaultW: 4, defaultH: 1, category: "stat" },
];

interface WidgetPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (type: string) => void;
  existingTypes: string[];
}

export function WidgetPicker({ open, onOpenChange, onAdd, existingTypes }: WidgetPickerProps) {
  const { t } = useTranslation();

  const categories = [
    { key: "stat", label: t("crm.dashboard.constructor.stats") },
    { key: "list", label: t("crm.dashboard.constructor.lists") },
    { key: "table", label: t("crm.dashboard.constructor.tables") },
    { key: "chart", label: t("crm.dashboard.constructor.charts") },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("crm.dashboard.constructor.addWidget")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {categories.map((cat) => {
            const widgets = WIDGET_CATALOG.filter((w) => w.category === cat.key);
            if (widgets.length === 0) return null;
            return (
              <div key={cat.key}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{cat.label}</p>
                <div className="grid grid-cols-2 gap-2">
                  {widgets.map((w) => {
                    const Icon = w.icon;
                    const alreadyAdded = existingTypes.includes(w.type);
                    return (
                      <button
                        key={w.type}
                        onClick={() => {
                          onAdd(w.type);
                          onOpenChange(false);
                        }}
                        disabled={alreadyAdded}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-lg border text-left text-sm transition-colors",
                          alreadyAdded
                            ? "opacity-40 cursor-not-allowed"
                            : "hover:bg-muted/50 hover:border-primary/20 cursor-pointer"
                        )}
                      >
                        <Icon className="size-4 text-muted-foreground shrink-0" />
                        <span className="truncate">{t(w.labelKey)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
