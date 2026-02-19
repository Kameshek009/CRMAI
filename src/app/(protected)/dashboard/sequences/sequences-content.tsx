"use client";

import { useState, useEffect, useCallback } from "react";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/crm/empty-state";
import { SequenceBuilder } from "@/components/crm/sequence-builder";
import { Plus, Mail, Users, Trash2, Layers, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useFeatureLimitStore } from "@/stores/feature-limit-store";
import { useTranslation } from "@/lib/i18n";

interface Sequence {
  id: string;
  name: string;
  is_active: boolean;
  trigger_type: string;
  step_count: number;
  active_enrollments: number;
  total_enrollments: number;
  created_at: string;
}

export function SequencesContent() {
  const { t } = useTranslation();
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const limitStore = useFeatureLimitStore();
  const atSequenceLimit = limitStore.isAtLimit("emailSequences");

  const handleAddClick = () => {
    if (atSequenceLimit) {
      const info = limitStore.getUsageInfo("emailSequences");
      limitStore.showUpgradeModal("emailSequences", info?.current ?? 0, info?.limit ?? 0);
    } else {
      setShowBuilder(true);
    }
  };

  const fetchSequences = useCallback(async () => {
    try {
      const res = await fetch("/api/crm/sequences");
      const json = await res.json();
      if (json.success) setSequences(json.data || []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSequences();
  }, [fetchSequences]);

  const handleToggle = async (id: string, isActive: boolean) => {
    const res = await fetch(`/api/crm/sequences/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: isActive }),
    });
    const json = await res.json();
    if (json.success) {
      setSequences((prev) =>
        prev.map((s) => (s.id === id ? { ...s, is_active: isActive } : s))
      );
      toast.success(isActive ? t("crm.sequences.activated") : t("crm.sequences.pausedMsg"));
    } else {
      toast.error(json.error || t("crm.sequences.failedUpdate"));
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/crm/sequences/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      setSequences((prev) => prev.filter((s) => s.id !== id));
      toast.success(t("crm.sequences.deletedMsg"));
    } else {
      toast.error(json.error || t("crm.sequences.failedDelete"));
    }
  };

  const handleCreated = () => {
    setShowBuilder(false);
    fetchSequences();
  };

  if (isLoading) {
    return (
      <PageContainer>
        <PageHeader title={t("crm.sequences.title")} />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={t("crm.sequences.title")}
        description={t("crm.sequences.description")}
      >
        <Button
          size="sm"
          onClick={handleAddClick}
          variant={atSequenceLimit ? "outline" : "default"}
        >
          {atSequenceLimit ? (
            <Sparkles className="size-3.5 mr-1.5" />
          ) : (
            <Plus className="size-3.5 mr-1.5" />
          )}
          {atSequenceLimit ? t("crm.sequences.upgradeToAdd") : t("crm.sequences.new")}
        </Button>
      </PageHeader>

      {sequences.length === 0 ? (
        <EmptyState
          icon={Mail}
          title={t("crm.sequences.noYet")}
          description={t("crm.sequences.noYetDesc")}
          actionLabel={t("crm.sequences.create")}
          onAction={handleAddClick}
        />
      ) : (
        <div className="space-y-3">
          {sequences.map((seq) => (
            <Card key={seq.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                      <Mail className="size-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold truncate">{seq.name}</h3>
                        <Badge variant={seq.is_active ? "default" : "secondary"} className="text-[10px] shrink-0">
                          {seq.is_active ? t("crm.sequences.active") : t("crm.sequences.pausedLabel")}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Layers className="size-3" />
                          {t("crm.sequences.steps", { count: seq.step_count })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="size-3" />
                          {t("crm.sequences.activeOf", { active: seq.active_enrollments, total: seq.total_enrollments })}
                        </span>
                        <span className="capitalize">{seq.trigger_type.replace("_", " ")}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Switch
                      checked={seq.is_active}
                      onCheckedChange={(checked) => handleToggle(seq.id, checked)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(seq.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SequenceBuilder
        open={showBuilder}
        onOpenChange={setShowBuilder}
        onCreated={handleCreated}
      />
    </PageContainer>
  );
}
