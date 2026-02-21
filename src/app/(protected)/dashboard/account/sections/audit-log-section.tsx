"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "@/lib/i18n";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";

interface AuditEntry {
  id: string;
  account_id: string;
  actor_name: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  changes: Record<string, { old: unknown; new: unknown }>;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  create: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  update: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  delete: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const ENTITY_TYPES = ["contacts", "companies", "deals", "crm_tasks", "crm_notes"];
const ACTIONS = ["create", "update", "delete"];

export function AuditLogSection() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [filterEntity, setFilterEntity] = useState("");
  const [filterAction, setFilterAction] = useState("");

  const limit = 25;

  const fetchLog = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (filterEntity) params.set("entity_type", filterEntity);
      if (filterAction) params.set("action", filterAction);

      const res = await fetch(`/api/crm/audit-log?${params}`);
      const json = await res.json();
      if (json.success) {
        setEntries(json.data || []);
        setTotal(json.total || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [page, filterEntity, filterAction]);

  useEffect(() => { fetchLog(); }, [fetchLog]);

  const totalPages = Math.ceil(total / limit);

  function formatDate(d: string) {
    return new Date(d).toLocaleString();
  }

  function formatValue(v: unknown): string {
    if (v === null || v === undefined) return "—";
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t("settings.auditLog.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("settings.auditLog.description")}</p>
      </div>
      <Separator />

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={filterEntity}
          onChange={(e) => { setFilterEntity(e.target.value); setPage(1); }}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">{t("settings.auditLog.allEntities")}</option>
          {ENTITY_TYPES.map((et) => (
            <option key={et} value={et}>{et}</option>
          ))}
        </select>
        <select
          value={filterAction}
          onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">{t("settings.auditLog.allActions")}</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>{t(`settings.auditLog.actions.${a}`)}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">{t("settings.auditLog.noRecords")}</p>
      ) : (
        <div className="space-y-1">
          {entries.map((entry) => {
            const isExpanded = expandedId === entry.id;
            const hasChanges = entry.changes && Object.keys(entry.changes).length > 0;

            return (
              <div key={entry.id} className="rounded-lg border">
                <button
                  type="button"
                  onClick={() => hasChanges && setExpandedId(isExpanded ? null : entry.id)}
                  className="flex items-center gap-3 w-full p-3 text-left hover:bg-muted/30 transition-colors"
                >
                  <span className="text-xs text-muted-foreground shrink-0 w-36">
                    {formatDate(entry.created_at)}
                  </span>
                  <span className="text-sm shrink-0 w-24 truncate">
                    {entry.actor_name || entry.account_id.slice(0, 8)}
                  </span>
                  <Badge variant="outline" className={`text-[10px] ${ACTION_COLORS[entry.action] || ""}`}>
                    {t(`settings.auditLog.actions.${entry.action}`)}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {entry.entity_type}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono truncate flex-1">
                    {entry.entity_id.slice(0, 8)}...
                  </span>
                  {hasChanges && (
                    isExpanded ? <ChevronUp className="size-4 text-muted-foreground shrink-0" /> : <ChevronDown className="size-4 text-muted-foreground shrink-0" />
                  )}
                </button>
                {isExpanded && hasChanges && (
                  <div className="px-3 pb-3 pt-0">
                    <div className="rounded bg-muted/50 p-3 text-xs font-mono space-y-1">
                      {Object.entries(entry.changes).map(([field, change]) => (
                        <div key={field} className="flex gap-2">
                          <span className="text-muted-foreground w-28 shrink-0">{field}</span>
                          <span className="text-red-600 dark:text-red-400 line-through">{formatValue(change.old)}</span>
                          <span className="text-muted-foreground">&rarr;</span>
                          <span className="text-emerald-600 dark:text-emerald-400">{formatValue(change.new)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {t("settings.auditLog.page")} {page} / {totalPages} ({total} {t("settings.auditLog.records")})
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" className="size-8" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="icon" className="size-8" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
