"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";
import { handleApiError } from "@/lib/crm/handle-api-error";
import { useFeatureLimitStore } from "@/stores/feature-limit-store";

interface AutomationBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const TRIGGER_TYPES = [
  { value: "record_created", label: "When a record is created" },
  { value: "record_updated", label: "When a record is updated" },
  { value: "field_changed", label: "When a specific field changes" },
  { value: "deal_stage_changed", label: "When a deal stage changes" },
];

const ENTITY_TYPES = [
  { value: "contact", label: "Contact" },
  { value: "company", label: "Organization" },
  { value: "deal", label: "Deal" },
  { value: "lead", label: "Lead" },
];

const ACTION_TYPES = [
  { value: "create_task", label: "Create a task" },
  { value: "update_field", label: "Update a field" },
  { value: "assign_to", label: "Assign to someone" },
];

const OPERATORS = [
  { value: "eq", label: "equals" },
  { value: "neq", label: "not equals" },
  { value: "gt", label: "greater than" },
  { value: "lt", label: "less than" },
  { value: "contains", label: "contains" },
  { value: "not_contains", label: "does not contain" },
];

interface ConditionForm {
  field: string;
  operator: string;
  value: string;
}

interface ActionForm {
  type: string;
  config: Record<string, string>;
}

const selectClasses = "flex h-9 w-full rounded-md border border-input bg-transparent px-4 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function AutomationBuilder({ open, onOpenChange, onCreated }: AutomationBuilderProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState("record_created");
  const [entityType, setEntityType] = useState("contact");
  const [triggerField, setTriggerField] = useState("");
  const [triggerFrom, setTriggerFrom] = useState("");
  const [triggerTo, setTriggerTo] = useState("");
  const [conditions, setConditions] = useState<ConditionForm[]>([]);
  const [actions, setActions] = useState<ActionForm[]>([
    { type: "create_task", config: { title: "" } },
  ]);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName("");
    setTriggerType("record_created");
    setEntityType("contact");
    setTriggerField("");
    setTriggerFrom("");
    setTriggerTo("");
    setConditions([]);
    setActions([{ type: "create_task", config: { title: "" } }]);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(t("crm.automations.nameRequired"));
      return;
    }
    if (actions.length === 0) {
      toast.error(t("crm.automations.actionRequired"));
      return;
    }

    setSaving(true);
    try {
      const triggerConfig: Record<string, string> = { entity_type: entityType };
      if (triggerType === "field_changed") {
        if (triggerField) triggerConfig.field = triggerField;
        if (triggerFrom) triggerConfig.from = triggerFrom;
        if (triggerTo) triggerConfig.to = triggerTo;
      }

      const res = await fetch("/api/crm/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          trigger_type: triggerType,
          trigger_config: triggerConfig,
          conditions: conditions.filter((c) => c.field && c.value),
          actions: actions.map((a) => ({
            type: a.type,
            config: Object.fromEntries(Object.entries(a.config).filter(([, v]) => v)),
          })),
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(t("crm.automations.created"));
        useFeatureLimitStore.getState().incrementUsage("activeAutomations");
        reset();
        onCreated();
      } else {
        handleApiError(json);
      }
    } finally {
      setSaving(false);
    }
  };

  const addCondition = () => {
    setConditions([...conditions, { field: "", operator: "eq", value: "" }]);
  };

  const updateCondition = (idx: number, key: keyof ConditionForm, val: string) => {
    const updated = [...conditions];
    updated[idx] = { ...updated[idx], [key]: val };
    setConditions(updated);
  };

  const removeCondition = (idx: number) => {
    setConditions(conditions.filter((_, i) => i !== idx));
  };

  const addAction = () => {
    setActions([...actions, { type: "create_task", config: { title: "" } }]);
  };

  const updateAction = (idx: number, type: string) => {
    const updated = [...actions];
    updated[idx] = { type, config: {} };
    setActions(updated);
  };

  const updateActionConfig = (idx: number, key: string, val: string) => {
    const updated = [...actions];
    updated[idx] = { ...updated[idx], config: { ...updated[idx].config, [key]: val } };
    setActions(updated);
  };

  const removeAction = (idx: number) => {
    setActions(actions.filter((_, i) => i !== idx));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Automation</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          {/* Name */}
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Auto-create follow-up task"
              maxLength={200}
            />
          </div>

          {/* Trigger */}
          <div className="space-y-3 rounded-lg border p-3">
            <div className="text-xs font-semibold uppercase text-muted-foreground">When</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Trigger</Label>
                <select value={triggerType} onChange={(e) => setTriggerType(e.target.value)} className={selectClasses}>
                  {TRIGGER_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Entity</Label>
                <select value={entityType} onChange={(e) => setEntityType(e.target.value)} className={selectClasses}>
                  {ENTITY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
            {triggerType === "field_changed" && (
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Field</Label>
                  <Input value={triggerField} onChange={(e) => setTriggerField(e.target.value)} placeholder="status" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">From</Label>
                  <Input value={triggerFrom} onChange={(e) => setTriggerFrom(e.target.value)} placeholder="any" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">To</Label>
                  <Input value={triggerTo} onChange={(e) => setTriggerTo(e.target.value)} placeholder="any" />
                </div>
              </div>
            )}
          </div>

          {/* Conditions */}
          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase text-muted-foreground">If (optional)</div>
              <Button variant="ghost" size="sm" onClick={addCondition} className="h-6 text-xs">
                <Plus className="size-3 mr-1" />
                Add
              </Button>
            </div>
            {conditions.map((c, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  value={c.field}
                  onChange={(e) => updateCondition(idx, "field", e.target.value)}
                  placeholder="field"
                  className="flex-1"
                />
                <select
                  value={c.operator}
                  onChange={(e) => updateCondition(idx, "operator", e.target.value)}
                  className={selectClasses + " w-32"}
                >
                  {OPERATORS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <Input
                  value={c.value}
                  onChange={(e) => updateCondition(idx, "value", e.target.value)}
                  placeholder="value"
                  className="flex-1"
                />
                <Button variant="ghost" size="icon" className="size-7 text-red-600 shrink-0" onClick={() => removeCondition(idx)}>
                  <Trash2 className="size-3" />
                </Button>
              </div>
            ))}
            {conditions.length === 0 && (
              <p className="text-xs text-muted-foreground">No conditions — automation will always run</p>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase text-muted-foreground">Then</div>
              <Button variant="ghost" size="sm" onClick={addAction} className="h-6 text-xs">
                <Plus className="size-3 mr-1" />
                Add
              </Button>
            </div>
            {actions.map((a, idx) => (
              <div key={idx} className="space-y-2 rounded-md border p-2">
                <div className="flex items-center gap-2">
                  <select
                    value={a.type}
                    onChange={(e) => updateAction(idx, e.target.value)}
                    className={selectClasses + " flex-1"}
                  >
                    {ACTION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <Button variant="ghost" size="icon" className="size-7 text-red-600 shrink-0" onClick={() => removeAction(idx)}>
                    <Trash2 className="size-3" />
                  </Button>
                </div>
                {/* Action-specific config */}
                {a.type === "create_task" && (
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={a.config.title || ""}
                      onChange={(e) => updateActionConfig(idx, "title", e.target.value)}
                      placeholder="Task title"
                    />
                    <select
                      value={a.config.priority || "medium"}
                      onChange={(e) => updateActionConfig(idx, "priority", e.target.value)}
                      className={selectClasses}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                )}
                {a.type === "update_field" && (
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={a.config.field || ""}
                      onChange={(e) => updateActionConfig(idx, "field", e.target.value)}
                      placeholder="Field name"
                    />
                    <Input
                      value={a.config.value || ""}
                      onChange={(e) => updateActionConfig(idx, "value", e.target.value)}
                      placeholder="New value"
                    />
                  </div>
                )}
                {a.type === "assign_to" && (
                  <Input
                    value={a.config.account_id || ""}
                    onChange={(e) => updateActionConfig(idx, "account_id", e.target.value)}
                    placeholder="Member account ID"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
            Create Automation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
