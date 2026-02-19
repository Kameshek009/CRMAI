"use client";

import { useState, useEffect, useCallback } from "react";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { AutomationBuilder } from "@/components/crm/automation-builder";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, Loader2, Zap, Clock } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import { cn } from "@/lib/utils";

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

const TRIGGER_LABELS: Record<string, string> = {
  record_created: "Record Created",
  record_updated: "Record Updated",
  field_changed: "Field Changed",
  deal_stage_changed: "Deal Stage Changed",
};

const ACTION_LABELS: Record<string, string> = {
  create_task: "Create Task",
  update_field: "Update Field",
  assign_to: "Assign To",
};

const ENTITY_LABELS: Record<string, string> = {
  contact: "Contact",
  company: "Organization",
  deal: "Deal",
  lead: "Lead",
};

export function AutomationsContent() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
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
        toast.success(active ? "Automation enabled" : "Automation paused");
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
        toast.success("Automation deleted");
      } else {
        toast.error("Failed to delete");
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
        <PageHeader title="Automations" description="Loading..." />
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
        title="Automations"
        description="Automate repetitive tasks with simple rules"
      >
        <Button onClick={() => setBuilderOpen(true)}>
          <Plus className="size-4 mr-2" />
          New Automation
        </Button>
      </PageHeader>

      {automations.length === 0 && !builderOpen ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Zap className="size-10 text-muted-foreground/30 mb-4" />
            <h3 className="text-sm font-semibold mb-1">No automations yet</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              Create rules to automate tasks when records are created or updated.
            </p>
            <Button onClick={() => setBuilderOpen(true)}>
              <Plus className="size-4 mr-2" />
              Create Your First Automation
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
                      {TRIGGER_LABELS[auto.trigger_type] || auto.trigger_type}
                    </Badge>
                    {auto.trigger_config.entity_type && (
                      <Badge variant="outline" className="text-[10px]">
                        {ENTITY_LABELS[auto.trigger_config.entity_type] || auto.trigger_config.entity_type}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      {auto.actions.length} action{auto.actions.length !== 1 ? "s" : ""}:
                      {" "}{auto.actions.map((a) => ACTION_LABELS[a.type] || a.type).join(", ")}
                    </span>
                    {auto.conditions.length > 0 && (
                      <span>{auto.conditions.length} condition{auto.conditions.length !== 1 ? "s" : ""}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                  <div className="flex items-center gap-1">
                    <Zap className="size-3" />
                    <span>{auto.run_count} runs</span>
                  </div>
                  {auto.last_run_at && (
                    <div className="flex items-center gap-1">
                      <Clock className="size-3" />
                      <span>{new Date(auto.last_run_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
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
        title="Delete automation"
        description="Are you sure you want to delete this automation? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDelete}
      />
    </PageContainer>
  );
}
