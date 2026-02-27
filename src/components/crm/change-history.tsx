"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import { Plus, Pencil, Trash2, Loader2, History } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuditEntry {
  id: string;
  action: string;
  actor_name: string | null;
  changes: Record<string, { old: unknown; new: unknown }> | null;
  created_at: string;
}

interface ChangeHistoryProps {
  entityType: string;
  entityId: string;
}

const ACTION_ICONS: Record<string, typeof Plus> = {
  create: Plus,
  update: Pencil,
  delete: Trash2,
};

const ACTION_COLORS: Record<string, string> = {
  create: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  update: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  delete: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "boolean") return val ? "true" : "false";
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function ChangeHistory({ entityType, entityId }: ChangeHistoryProps) {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    fetch(`/api/crm/audit-log?entity_type=${entityType}&entity_id=${entityId}&limit=50`, { signal: controller.signal })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setEntries(res.data || []);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
    return () => controller.abort();
  }, [entityType, entityId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <History className="size-8 mb-2 opacity-50" />
        <p className="text-sm">{t("crm.history.noHistory")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {entries.map((entry, idx) => {
        const Icon = ACTION_ICONS[entry.action] || Pencil;
        const colorClass = ACTION_COLORS[entry.action] || ACTION_COLORS.update;
        const actionLabel = t(`crm.history.${entry.action}`) || entry.action;
        const changes = entry.changes ? Object.entries(entry.changes) : [];

        return (
          <div key={entry.id} className="flex gap-3 py-3">
            {/* Timeline line + icon */}
            <div className="flex flex-col items-center">
              <div className={cn("size-7 rounded-full flex items-center justify-center shrink-0", colorClass)}>
                <Icon className="size-3.5" />
              </div>
              {idx < entries.length - 1 && (
                <div className="w-px flex-1 bg-border mt-1" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium">{actionLabel}</span>
                <span className="text-xs text-muted-foreground">
                  {entry.actor_name || "System"}
                </span>
                <span className="text-xs text-muted-foreground ml-auto shrink-0">
                  {timeAgo(entry.created_at)}
                </span>
              </div>

              {/* Changed fields */}
              {changes.length > 0 && (
                <div className="mt-1.5 space-y-1">
                  {changes.map(([field, { old: oldVal, new: newVal }]) => (
                    <div key={field} className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground/70">{field}</span>
                      {": "}
                      <span className="line-through opacity-60">{formatValue(oldVal)}</span>
                      {" → "}
                      <span className="text-foreground/80">{formatValue(newVal)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
