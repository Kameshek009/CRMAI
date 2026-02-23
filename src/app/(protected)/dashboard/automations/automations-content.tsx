"use client";

import { useState, useEffect, useCallback } from "react";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { AutomationBuilder } from "@/components/crm/automation-builder";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, Zap, Clock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import { useFeatureLimitStore } from "@/stores/feature-limit-store";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

interface Automation {
  id: string;
  name: string;
  is_active: boolean;
  trigger_type: string;
  trigger_config: Record<string, string>;
  conditions: { field: string; operator: string; value: unknown }[];
  actions: { type: string; config: Record<string, unknown> }[];
  run_count: number;
  last_run_at: string | null;
  created_at: string;
}

export function AutomationsContent() {
  const { t } = useTranslation();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const limitStore = useFeatureLimitStore();
  const atAutomationLimit = limitStore.isAtLimit("activeAutomations");

  const triggerLabels: Record<string, string> = {
    record_created: t("crm.automations.triggers.recordCreated"),
    record_updated: t("crm.automations.triggers.recordUpdated"),
    field_changed: t("crm.automations.triggers.fieldChanged"),
    deal_stage_changed: t("crm.automations.triggers.dealStageChanged"),
  };

  const actionLabels: Record<string, string> = {
    create_task: t("crm.automations.actionTypes.createTask"),
    update_field: t("crm.automations.actionTypes.updateField"),
    assign_to: t("crm.automations.actionTypes.assignTo"),
  };

  const entityLabels: Record<string, string> = {
    contact: t("crm.automations.entities.contact"),
    company: t("crm.automations.entities.company"),
    deal: t("crm.automations.entities.deal"),
  };

  const handleAddClick = () => {
    if (atAutomationLimit) {
      const info = limitStore.getUsageInfo("activeAutomations");
      limitStore.showUpgradeModal("activeAutomations", info?.current ?? 0, info?.limit ?? 0);
    } else {
      setBuilderOpen(true);
    }
  };
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchAutomations = useCallback(async () => {
    try {
      const res = await fetch("/api/crm/automations");
      const json = await res.json();
      if (json.success) setAutomations(json.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAutomations();
  }, [fetchAutomations]);

  const handleToggle = async (id: string, active: boolean) => {
    setTogglingId(id);
    try {
      const res = await fetch(`/api/crm/automations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: active }),
      });
      const json = await res.json();
      if (json.success) {
        setAutomations((prev) =>
          prev.map((a) => (a.id === id ? { ...a, is_active: active } : a))
        );
        toast.success(active ? t("crm.automations.enabled") : t("crm.automations.paused"));
      }
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/crm/automations/${deleteId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setAutomations((prev) => prev.filter((a) => a.id !== deleteId));
        toast.success(t("crm.automations.deletedMsg"));
      } else {
        toast.error(t("crm.automations.failedDelete"));
      }
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleCreated = () => {
    setBuilderOpen(false);
    fetchAutomations();
  };

  if (loading) {
    return (
      <PageContainer>
        <PageHeader title={t("crm.automations.title")} description={t("crm.automations.loading")} />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={t("crm.automations.title")}
        description={t("crm.automations.description")}
      >
        <Button onClick={handleAddClick} variant={atAutomationLimit ? "outline" : "default"}>
          {atAutomationLimit ? <Sparkles className="size-4 mr-2" /> : <Plus className="size-4 mr-2" />}
          {atAutomationLimit ? t("crm.automations.upgradeToAdd") : t("crm.automations.new")}
        </Button>
      </PageHeader>

      {automations.length === 0 && !builderOpen ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Zap className="size-10 text-muted-foreground/30 mb-4" />
            <h3 className="text-sm font-semibold mb-1">{t("crm.automations.noYet")}</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              {t("crm.automations.noYetDesc")}
            </p>
            <Button onClick={handleAddClick}>
              <Plus className="size-4 mr-2" />
              {t("crm.automations.createFirst")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {automations.map((auto) => (
            <Card key={auto.id} className={cn(!auto.is_active && "opacity-60")}>
              <CardContent className="flex items-center gap-4 py-4">
                <Switch
                  checked={auto.is_active}
                  onCheckedChange={(v) => handleToggle(auto.id, v)}
                  disabled={togglingId === auto.id}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold">{auto.name}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {triggerLabels[auto.trigger_type] || auto.trigger_type}
                    </Badge>
                    {auto.trigger_config.entity_type && (
                      <Badge variant="outline" className="text-[10px]">
                        {entityLabels[auto.trigger_config.entity_type] || auto.trigger_config.entity_type}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      {auto.actions.length === 1 ? t("crm.automations.action", { count: 1 }) : t("crm.automations.actions", { count: auto.actions.length })}:
                      {" "}{auto.actions.map((a) => actionLabels[a.type] || a.type).join(", ")}
                    </span>
                    {auto.conditions.length > 0 && (
                      <span>{auto.conditions.length === 1 ? t("crm.automations.condition", { count: 1 }) : t("crm.automations.conditions", { count: auto.conditions.length })}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                  <div className="flex items-center gap-1">
                    <Zap className="size-3" />
                    <span>{t("crm.automations.runs", { count: auto.run_count })}</span>
                  </div>
                  {auto.last_run_at && (
                    <div className="flex items-center gap-1">
                      <Clock className="size-3" />
                      <span>{new Date(auto.last_run_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 shrink-0"
                  onClick={() => setDeleteId(auto.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AutomationBuilder
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        onCreated={handleCreated}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(v) => !v && setDeleteId(null)}
        title={t("crm.automations.deleteTitle")}
        description={t("crm.automations.deleteConfirm")}
        confirmLabel={t("crm.automations.deleteLabel")}
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDelete}
      />
    </PageContainer>
  );
}
