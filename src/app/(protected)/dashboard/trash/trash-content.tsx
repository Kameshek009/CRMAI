"use client";

import { useState, useEffect, useCallback } from "react";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import { BulkActionBar } from "@/components/crm/bulk-action-bar";
import { toast } from "sonner";
import { useWorkspace } from "@/contexts/team-context";
import {
  Trash2, RotateCcw, Users, Building2, Handshake, CheckSquare, FileText, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TrashItem {
  id: string;
  entity_type: string;
  name: string;
  deleted_at: string;
  deleted_by: string | null;
}

const ENTITY_TABS = ["all", "contacts", "companies", "deals", "tasks", "notes"] as const;

const ENTITY_ICONS: Record<string, typeof Users> = {
  contacts: Users,
  companies: Building2,
  deals: Handshake,
  tasks: CheckSquare,
  notes: FileText,
};

const ENTITY_COLORS: Record<string, string> = {
  contacts: "bg-blue-500/10 text-blue-600",
  companies: "bg-emerald-500/10 text-emerald-600",
  deals: "bg-amber-500/10 text-amber-600",
  tasks: "bg-purple-500/10 text-purple-600",
  notes: "bg-slate-500/10 text-slate-600",
};

function useTimeAgo() {
  const { t } = useTranslation();
  return (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t("crm.activity.justNow");
    if (mins < 60) return t("crm.activity.mAgo", { count: mins });
    const hours = Math.floor(mins / 60);
    if (hours < 24) return t("crm.activity.hAgo", { count: hours });
    const days = Math.floor(hours / 24);
    return t("crm.activity.dAgo", { count: days });
  };
}

/** Group selected items by entity_type for bulk API calls */
function groupByType(items: TrashItem[], selectedIds: Set<string>) {
  const grouped: Record<string, string[]> = {};
  for (const item of items) {
    if (!selectedIds.has(item.id)) continue;
    if (!grouped[item.entity_type]) grouped[item.entity_type] = [];
    grouped[item.entity_type]!.push(item.id);
  }
  return grouped;
}

export function TrashContent() {
  const { t } = useTranslation();
  const { isOwner } = useWorkspace();
  const timeAgo = useTimeAgo();
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [purgeItem, setPurgeItem] = useState<TrashItem | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [confirmBulkPurge, setConfirmBulkPurge] = useState(false);

  const fetchTrash = useCallback(async () => {
    setLoading(true);
    try {
      const params = activeTab !== "all" ? `?entity_type=${activeTab}` : "";
      const res = await fetch(`/api/crm/trash${params}`);
      const json = await res.json();
      if (json.success) {
        setItems(json.data || []);
      } else {
        toast.error(t("crm.trash.failedRestore"));
      }
    } catch {
      toast.error(t("crm.trash.failedRestore"));
    } finally {
      setLoading(false);
      setSelectedIds(new Set());
    }
  }, [activeTab, t]);

  useEffect(() => { fetchTrash(); }, [fetchTrash]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  const handleRestore = async (item: TrashItem) => {
    setActionLoading(item.id);
    try {
      const res = await fetch("/api/crm/trash/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity_type: item.entity_type, id: item.id }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(t("crm.trash.restored"));
        setItems((prev) => prev.filter((i) => i.id !== item.id));
        setSelectedIds((prev) => { const next = new Set(prev); next.delete(item.id); return next; });
      } else {
        toast.error(json.error || t("crm.trash.failedRestore"));
      }
    } catch {
      toast.error(t("crm.trash.failedRestore"));
    } finally {
      setActionLoading(null);
    }
  };

  const handlePurge = async () => {
    if (!purgeItem) return;
    setActionLoading(purgeItem.id);
    try {
      const res = await fetch("/api/crm/trash/purge", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity_type: purgeItem.entity_type, id: purgeItem.id }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(t("crm.trash.deleted"));
        setItems((prev) => prev.filter((i) => i.id !== purgeItem.id));
        setSelectedIds((prev) => { const next = new Set(prev); next.delete(purgeItem.id); return next; });
      } else {
        toast.error(json.error || t("crm.trash.failedDelete"));
      }
    } catch {
      toast.error(t("crm.trash.failedDelete"));
    } finally {
      setActionLoading(null);
      setPurgeItem(null);
    }
  };

  const handleBulkRestore = async () => {
    setBulkLoading(true);
    try {
      const grouped = groupByType(items, selectedIds);
      const results = await Promise.all(
        Object.entries(grouped).map(([entityType, ids]) =>
          fetch("/api/crm/trash/restore", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ entity_type: entityType, ids }),
          }).then((r) => r.json())
        )
      );
      const allOk = results.every((r) => r.success);
      if (allOk) {
        toast.success(t("crm.trash.restored"));
        setItems((prev) => prev.filter((i) => !selectedIds.has(i.id)));
        setSelectedIds(new Set());
      } else {
        toast.error(t("crm.trash.failedRestore"));
      }
    } catch {
      toast.error(t("crm.trash.failedRestore"));
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkPurge = async () => {
    setBulkLoading(true);
    try {
      const grouped = groupByType(items, selectedIds);
      const results = await Promise.all(
        Object.entries(grouped).map(([entityType, ids]) =>
          fetch("/api/crm/trash/purge", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ entity_type: entityType, ids }),
          }).then((r) => r.json())
        )
      );
      const allOk = results.every((r) => r.success);
      if (allOk) {
        toast.success(t("crm.trash.deleted"));
        setItems((prev) => prev.filter((i) => !selectedIds.has(i.id)));
        setSelectedIds(new Set());
      } else {
        toast.error(t("crm.trash.failedDelete"));
      }
    } catch {
      toast.error(t("crm.trash.failedDelete"));
    } finally {
      setBulkLoading(false);
      setConfirmBulkPurge(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader title={t("crm.trash.title")} description={t("crm.trash.autoDelete")} />

      {/* Entity type tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2">
        {ENTITY_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap",
              activeTab === tab
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            {t(`crm.trash.entityTypes.${tab}`)}
          </button>
        ))}
      </div>

      {/* Items list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Trash2 className="size-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">{t("crm.trash.empty")}</p>
          <p className="text-xs text-muted-foreground/70 mt-1">{t("crm.trash.emptyDesc")}</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-3 py-2 w-10">
                  <Checkbox
                    checked={items.length > 0 && selectedIds.size === items.length}
                    onCheckedChange={toggleSelectAll}
                    aria-label={t("common.selectAll")}
                  />
                </th>
                <th className="px-3 py-2 text-xs font-medium text-muted-foreground text-left">{t("crm.trash.entityTypes.all")}</th>
                <th className="px-3 py-2 text-xs font-medium text-muted-foreground text-left">{t("crm.trash.deletedAt")}</th>
                <th className="px-3 py-2 text-xs font-medium text-muted-foreground text-right" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const Icon = ENTITY_ICONS[item.entity_type] || FileText;
                const color = ENTITY_COLORS[item.entity_type] || "bg-muted text-muted-foreground";
                const isSelected = selectedIds.has(item.id);
                return (
                  <tr key={`${item.entity_type}-${item.id}`} className={cn("border-b border-border last:border-0", isSelected && "bg-muted/30")}>
                    <td className="px-3 py-2.5 w-10">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(item.id)}
                        aria-label={item.name}
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0", color)}>
                          <Icon className="size-3.5" />
                        </div>
                        <div>
                          <span className="text-sm font-medium">{item.name || "—"}</span>
                          <Badge variant="outline" className="ml-2 text-[10px]">
                            {t(`crm.trash.entityTypes.${item.entity_type}`)}
                          </Badge>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {timeAgo(item.deleted_at)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={actionLoading === item.id}
                          onClick={() => handleRestore(item)}
                        >
                          {actionLoading === item.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="size-3.5" />
                          )}
                          <span className="ml-1 hidden sm:inline">{t("crm.trash.restore")}</span>
                        </Button>
                        {isOwner && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            disabled={actionLoading === item.id}
                            onClick={() => setPurgeItem(item)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <BulkActionBar
        selectedCount={selectedIds.size}
        onDeselectAll={() => setSelectedIds(new Set())}
        actions={[
          {
            label: t("crm.trash.restore"),
            icon: <RotateCcw className="size-3.5" />,
            onClick: handleBulkRestore,
          },
          ...(isOwner ? [{
            label: t("crm.trash.permanentDelete"),
            variant: "destructive" as const,
            icon: <Trash2 className="size-3.5" />,
            onClick: () => setConfirmBulkPurge(true),
          }] : []),
        ]}
      />

      <ConfirmDialog
        open={!!purgeItem}
        onOpenChange={(open) => !open && setPurgeItem(null)}
        title={t("crm.trash.permanentDeleteTitle")}
        description={t("crm.trash.permanentDeleteConfirm")}
        confirmLabel={t("crm.trash.permanentDelete")}
        variant="destructive"
        isLoading={!!actionLoading}
        onConfirm={handlePurge}
      />

      <ConfirmDialog
        open={confirmBulkPurge}
        onOpenChange={(open) => !open && setConfirmBulkPurge(false)}
        title={t("crm.trash.permanentDeleteTitle")}
        description={t("crm.trash.bulkPurgeConfirm", { count: selectedIds.size })}
        confirmLabel={t("crm.trash.permanentDelete")}
        variant="destructive"
        isLoading={bulkLoading}
        onConfirm={handleBulkPurge}
      />
    </PageContainer>
  );
}
