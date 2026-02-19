"use client";

import { useState, useEffect, useCallback } from "react";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Clock } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface ActivityLogEntry {
  id: string;
  event_type: string;
  message: string;
  metadata: Record<string, unknown>;
  session_id: string | null;
  created_at: string;
}

const eventTypeColors: Record<string, string> = {
  session_start: "bg-green-500/10 text-green-600",
  session_end: "bg-gray-500/10 text-gray-600",
  action_executed: "bg-blue-500/10 text-blue-600",
  payment_succeeded: "bg-emerald-500/10 text-emerald-600",
  payment_failed: "bg-red-500/10 text-red-600",
  subscription_created: "bg-purple-500/10 text-purple-600",
  subscription_cancelled: "bg-orange-500/10 text-orange-600",
  tier_upgraded: "bg-violet-500/10 text-violet-600",
  tier_downgraded: "bg-amber-500/10 text-amber-600",
  credits_purchased: "bg-emerald-500/10 text-emerald-600",
  weekly_reset: "bg-sky-500/10 text-sky-600",
  monthly_reset: "bg-sky-500/10 text-sky-600",
  error: "bg-red-500/10 text-red-600",
  warning: "bg-yellow-500/10 text-yellow-600",
  info: "bg-blue-500/10 text-blue-600",
};

function formatEventType(type: string) {
  return type.replace(/_/g, " ");
}

export function ActivityContent() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const timeAgo = useCallback((dateStr: string) => {
    const now = Date.now();
    const diff = now - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return t("crm.activity.justNow");
    if (minutes < 60) return t("crm.activity.mAgo", { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t("crm.activity.hAgo", { count: hours });
    const days = Math.floor(hours / 24);
    if (days < 30) return t("crm.activity.dAgo", { count: days });
    return new Date(dateStr).toLocaleDateString();
  }, [t]);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/activity/log?limit=50");
      const json = await res.json();
      if (json.success) {
        setLogs(json.data?.logs || []);
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <PageContainer>
      <PageHeader title={t("crm.activity.title")} description={t("crm.activity.description")} />

      {isLoading ? (
        <Card>
          <CardContent className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-4">
                <Skeleton className="h-6 w-24 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Activity className="size-10 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm font-medium">{t("crm.activity.noYet")}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t("crm.activity.noYetDesc")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-4 px-4 py-4 hover:bg-muted/30 transition-colors">
                  <Badge
                    variant="secondary"
                    className={`text-xs shrink-0 mt-1 ${eventTypeColors[log.event_type] || "bg-gray-500/10 text-gray-600"}`}
                  >
                    {formatEventType(log.event_type)}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{log.message}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                    <Clock className="size-3" />
                    {timeAgo(log.created_at)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
