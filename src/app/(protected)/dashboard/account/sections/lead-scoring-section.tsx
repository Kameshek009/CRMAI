"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, Sparkles, Target } from "lucide-react";
import { OPERATORS, type Operator } from "@/lib/lead-scoring/types";

type Rule = {
  id: string;
  name: string;
  description: string | null;
  condition: { field: string; operator: Operator; value?: unknown };
  weight: number;
  is_active: boolean;
  sort_order: number;
};

type CustomField = { field_key: string; label: string };

const BUILTIN_FIELDS = [
  "first_name",
  "last_name",
  "email",
  "phone",
  "mobile",
  "organization",
  "website",
  "job_title",
  "source",
  "status",
  "tags",
  "notes",
];

const OPS_NEEDING_VALUE: Operator[] = [
  "eq",
  "ne",
  "gt",
  "lt",
  "gte",
  "lte",
  "contains",
  "not_contains",
  "starts_with",
  "ends_with",
  "in",
  "not_in",
  "regex",
];

function parseValue(raw: string, op: Operator): unknown {
  if (op === "in" || op === "not_in") {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  if (["gt", "lt", "gte", "lte"].includes(op)) {
    const n = Number(raw);
    return Number.isFinite(n) ? n : raw;
  }
  if (raw === "true") return true;
  if (raw === "false") return false;
  return raw;
}

function summarize(rule: Rule): string {
  const op = rule.condition.operator;
  const v = rule.condition.value;
  if (op === "exists" || op === "not_exists" || op === "empty" || op === "not_empty") {
    return `${rule.condition.field} is ${op.replace("_", " ")}`;
  }
  return `${rule.condition.field} ${op} ${JSON.stringify(v)}`;
}

export function LeadScoringSection() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(false);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [draft, setDraft] = useState({
    name: "",
    description: "",
    field: "",
    operator: "not_empty" as Operator,
    valueRaw: "",
    weight: 10,
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [rulesRes, fieldsRes] = await Promise.all([
        fetch("/api/lead-scoring/rules"),
        fetch("/api/crm/fields?entity_type=lead"),
      ]);
      const rulesJson = await rulesRes.json();
      const fieldsJson = await fieldsRes.json();
      if (rulesJson.success) setRules(rulesJson.data);
      if (fieldsJson.success) {
        setCustomFields(
          (fieldsJson.data ?? []).map((f: { field_key: string; label: string }) => ({
            field_key: f.field_key,
            label: f.label,
          })),
        );
      }
    } catch {
      toast.error("Failed to load rules");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openCreate() {
    setEditing(null);
    setDraft({
      name: "",
      description: "",
      field: "phone",
      operator: "not_empty",
      valueRaw: "",
      weight: 10,
      is_active: true,
    });
    setEditorOpen(true);
  }

  function openEdit(rule: Rule) {
    setEditing(rule);
    setDraft({
      name: rule.name,
      description: rule.description ?? "",
      field: rule.condition.field,
      operator: rule.condition.operator,
      valueRaw:
        rule.condition.value === undefined
          ? ""
          : Array.isArray(rule.condition.value)
            ? rule.condition.value.join(", ")
            : String(rule.condition.value),
      weight: rule.weight,
      is_active: rule.is_active,
    });
    setEditorOpen(true);
  }

  async function save() {
    if (!draft.name.trim() || !draft.field.trim()) {
      toast.error("Name and field are required");
      return;
    }
    const condition = {
      field: draft.field.trim(),
      operator: draft.operator,
      value: OPS_NEEDING_VALUE.includes(draft.operator)
        ? parseValue(draft.valueRaw, draft.operator)
        : undefined,
    };
    const payload = {
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      condition,
      weight: draft.weight,
      is_active: draft.is_active,
    };
    setSaving(true);
    try {
      const url = editing
        ? `/api/lead-scoring/rules/${editing.id}`
        : "/api/lead-scoring/rules";
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || "Save failed");
        return;
      }
      toast.success(editing ? "Rule updated" : "Rule created");
      setEditorOpen(false);
      await load();
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(rule: Rule) {
    const next = !rule.is_active;
    setRules((rs) => rs.map((r) => (r.id === rule.id ? { ...r, is_active: next } : r)));
    try {
      const res = await fetch(`/api/lead-scoring/rules/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("Failed to toggle");
      setRules((rs) => rs.map((r) => (r.id === rule.id ? { ...r, is_active: !next } : r)));
    }
  }

  async function deleteRule(rule: Rule) {
    if (!confirm(`Delete "${rule.name}"?`)) return;
    try {
      const res = await fetch(`/api/lead-scoring/rules/${rule.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || "Delete failed");
        return;
      }
      toast.success("Rule deleted");
      await load();
    } catch {
      toast.error("Delete failed");
    }
  }

  async function installTemplates() {
    setInstalling(true);
    try {
      const res = await fetch("/api/lead-scoring/rules/install-templates", {
        method: "POST",
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || "Install failed");
        return;
      }
      toast.success(`Installed ${json.inserted} rules (${json.skipped} skipped)`);
      await load();
    } catch {
      toast.error("Install failed");
    } finally {
      setInstalling(false);
    }
  }

  async function recomputeAll() {
    try {
      const res = await fetch("/api/lead-scoring/recompute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || "Recompute failed");
        return;
      }
      toast.success(`Recomputed ${json.scored} leads`);
    } catch {
      toast.error("Recompute failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Lead Scoring</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Score is recomputed on every lead create/update and nightly. Sum of all matched rules, clamped to 0&ndash;100.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={recomputeAll} disabled={rules.length === 0}>
            <Target className="size-4" />
            Recompute all
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-4" />
            Add rule
          </Button>
        </div>
      </div>
      <Separator />

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : rules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <Sparkles className="size-8 text-muted-foreground" />
            <div>
              <p className="font-medium text-sm">No scoring rules yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Start with a set of common rules or define your own.
              </p>
            </div>
            <Button size="sm" onClick={installTemplates} disabled={installing}>
              {installing ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Install common rules
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <Card key={rule.id}>
              <CardContent className="flex items-center gap-3 py-3">
                <Badge variant={rule.weight >= 0 ? "default" : "destructive"} className="shrink-0 min-w-12 justify-center">
                  {rule.weight > 0 ? `+${rule.weight}` : rule.weight}
                </Badge>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{rule.name}</p>
                    {!rule.is_active && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono truncate">{summarize(rule)}</p>
                </div>
                <Switch
                  checked={rule.is_active}
                  onCheckedChange={() => toggleActive(rule)}
                  aria-label="Active"
                />
                <Button variant="ghost" size="icon" onClick={() => openEdit(rule)}>
                  <Pencil className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => deleteRule(rule)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit rule" : "New rule"}</DialogTitle>
            <DialogDescription>
              One condition per rule. Combine with multiple rules to express AND / OR logic.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="rule-name">Name</Label>
              <Input
                id="rule-name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Has phone number"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="rule-desc">Description (optional)</Label>
              <Textarea
                id="rule-desc"
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="rule-field">Field</Label>
                <Input
                  id="rule-field"
                  list="lead-fields"
                  value={draft.field}
                  onChange={(e) => setDraft({ ...draft, field: e.target.value })}
                  placeholder="phone"
                />
                <datalist id="lead-fields">
                  {BUILTIN_FIELDS.map((f) => (
                    <option key={f} value={f} />
                  ))}
                  {customFields.map((f) => (
                    <option key={f.field_key} value={`metadata.${f.field_key}`}>
                      {f.label} (custom)
                    </option>
                  ))}
                </datalist>
              </div>
              <div className="space-y-1">
                <Label htmlFor="rule-op">Operator</Label>
                <Select
                  value={draft.operator}
                  onValueChange={(v) => setDraft({ ...draft, operator: v as Operator })}
                >
                  <SelectTrigger id="rule-op">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERATORS.map((op) => (
                      <SelectItem key={op} value={op}>
                        {op}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {OPS_NEEDING_VALUE.includes(draft.operator) && (
              <div className="space-y-1">
                <Label htmlFor="rule-value">
                  Value
                  {(draft.operator === "in" || draft.operator === "not_in") && (
                    <span className="text-xs text-muted-foreground ml-2">comma-separated</span>
                  )}
                </Label>
                <Input
                  id="rule-value"
                  value={draft.valueRaw}
                  onChange={(e) => setDraft({ ...draft, valueRaw: e.target.value })}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="rule-weight">Weight</Label>
                <Input
                  id="rule-weight"
                  type="number"
                  min={-100}
                  max={100}
                  value={draft.weight}
                  onChange={(e) => setDraft({ ...draft, weight: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <Switch
                  id="rule-active"
                  checked={draft.is_active}
                  onCheckedChange={(v) => setDraft({ ...draft, is_active: v })}
                />
                <Label htmlFor="rule-active">Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
