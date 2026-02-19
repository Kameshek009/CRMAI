"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, GripVertical, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CustomFieldDefinition } from "@/lib/crm/field-definitions";

const ENTITY_TYPES = [
  { value: "contact", label: "Contacts" },
  { value: "company", label: "Organizations" },
  { value: "deal", label: "Deals" },
  { value: "lead", label: "Leads" },
];

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Long Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Select" },
  { value: "multi_select", label: "Multi Select" },
  { value: "url", label: "URL" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "boolean", label: "Yes/No" },
  { value: "currency", label: "Currency" },
  { value: "percent", label: "Percent" },
];

const FIELD_TYPE_COLORS: Record<string, string> = {
  text: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  textarea: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  number: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  date: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  select: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  multi_select: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  url: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  email: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  phone: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  boolean: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  currency: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  percent: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

interface FieldFormData {
  field_key: string;
  label: string;
  field_type: string;
  is_required: boolean;
  options: { value: string; label: string; color?: string }[];
}

const INITIAL_FORM: FieldFormData = {
  field_key: "",
  label: "",
  field_type: "text",
  is_required: false,
  options: [],
};

function labelToKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 50);
}

export function FieldManager() {
  const [entityType, setEntityType] = useState("contact");
  const [fields, setFields] = useState<CustomFieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null);
  const [form, setForm] = useState<FieldFormData>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchFields = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/crm/fields?entity_type=${entityType}`);
      const json = await res.json();
      if (json.success) setFields(json.data || []);
    } finally {
      setLoading(false);
    }
  }, [entityType]);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  const openCreate = () => {
    setEditingField(null);
    setForm(INITIAL_FORM);
    setDialogOpen(true);
  };

  const openEdit = (field: CustomFieldDefinition) => {
    setEditingField(field);
    setForm({
      field_key: field.field_key,
      label: field.label,
      field_type: field.field_type,
      is_required: field.is_required,
      options: field.options || [],
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.label.trim()) {
      toast.error("Label is required");
      return;
    }
    setSaving(true);
    try {
      if (editingField) {
        // Update
        const res = await fetch(`/api/crm/fields/${editingField.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: form.label.trim(),
            is_required: form.is_required,
            options: ["select", "multi_select"].includes(form.field_type) ? form.options : undefined,
          }),
        });
        const json = await res.json();
        if (json.success) {
          toast.success("Field updated");
          setDialogOpen(false);
          fetchFields();
        } else {
          toast.error(json.error || "Failed to update");
        }
      } else {
        // Create
        const key = form.field_key.trim() || labelToKey(form.label);
        if (!key || !/^[a-z][a-z0-9_]*$/.test(key)) {
          toast.error("Field key must be lowercase snake_case starting with a letter");
          setSaving(false);
          return;
        }
        const res = await fetch("/api/crm/fields", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entity_type: entityType,
            field_key: key,
            label: form.label.trim(),
            field_type: form.field_type,
            is_required: form.is_required,
            options: ["select", "multi_select"].includes(form.field_type) ? form.options : undefined,
            position: fields.length,
          }),
        });
        const json = await res.json();
        if (json.success) {
          toast.success("Field created");
          setDialogOpen(false);
          fetchFields();
        } else {
          toast.error(json.error || "Failed to create");
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this custom field? Existing data in this field will remain in metadata.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/crm/fields/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Field deleted");
        fetchFields();
      } else {
        toast.error(json.error || "Failed to delete");
      }
    } finally {
      setDeletingId(null);
    }
  };

  const addOption = () => {
    setForm({ ...form, options: [...form.options, { value: "", label: "" }] });
  };

  const updateOption = (idx: number, key: "value" | "label", val: string) => {
    const updated = [...form.options];
    updated[idx] = { ...updated[idx], [key]: val };
    // Auto-fill value from label
    if (key === "label" && !updated[idx].value) {
      updated[idx].value = val.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    }
    setForm({ ...form, options: updated });
  };

  const removeOption = (idx: number) => {
    setForm({ ...form, options: form.options.filter((_, i) => i !== idx) });
  };

  const showOptions = ["select", "multi_select"].includes(form.field_type);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Custom Fields</CardTitle>
            <CardDescription>Define custom fields for your CRM entities</CardDescription>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-3.5 mr-1.5" />
            Add Field
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Entity type tabs */}
        <div className="flex gap-1 mb-4 p-1 bg-muted rounded-lg w-fit">
          {ENTITY_TYPES.map((et) => (
            <button
              key={et.value}
              onClick={() => setEntityType(et.value)}
              className={cn(
                "px-3 py-1.5 text-sm rounded-md transition-colors",
                entityType === et.value
                  ? "bg-background shadow-sm font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {et.label}
            </button>
          ))}
        </div>

        {/* Fields list */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : fields.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No custom fields yet. Click &quot;Add Field&quot; to create one.
          </div>
        ) : (
          <div className="space-y-2">
            {fields.map((field) => (
              <div
                key={field.id}
                className="flex items-center gap-3 rounded-lg border p-3 group"
              >
                <GripVertical className="size-4 text-muted-foreground/40 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{field.label}</span>
                    <Badge variant="outline" className={cn("text-[10px]", FIELD_TYPE_COLORS[field.field_type])}>
                      {FIELD_TYPES.find((t) => t.value === field.field_type)?.label || field.field_type}
                    </Badge>
                    {field.is_required && (
                      <Badge variant="outline" className="text-[10px] text-red-600 border-red-200">
                        Required
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{field.field_key}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(field)}>
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                    onClick={() => handleDelete(field.id)}
                    disabled={deletingId === field.id}
                  >
                    {deletingId === field.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingField ? "Edit Field" : "Add Custom Field"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Label</Label>
              <Input
                value={form.label}
                onChange={(e) => {
                  const label = e.target.value;
                  setForm({
                    ...form,
                    label,
                    field_key: editingField ? form.field_key : labelToKey(label),
                  });
                }}
                placeholder="e.g. LinkedIn URL"
                maxLength={100}
              />
            </div>

            {!editingField && (
              <>
                <div className="space-y-2">
                  <Label>Field Key</Label>
                  <Input
                    value={form.field_key}
                    onChange={(e) => setForm({ ...form, field_key: e.target.value })}
                    placeholder="e.g. linkedin_url"
                    maxLength={50}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">Lowercase snake_case. Auto-generated from label.</p>
                </div>

                <div className="space-y-2">
                  <Label>Field Type</Label>
                  <select
                    value={form.field_type}
                    onChange={(e) => setForm({ ...form, field_type: e.target.value })}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-4 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {FIELD_TYPES.map((ft) => (
                      <option key={ft.value} value={ft.value}>{ft.label}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <label className="flex items-center justify-between">
              <span className="text-sm">Required</span>
              <Switch
                checked={form.is_required}
                onCheckedChange={(v) => setForm({ ...form, is_required: v })}
              />
            </label>

            {/* Options for select/multi_select */}
            {showOptions && (
              <div className="space-y-2">
                <Label>Options</Label>
                {form.options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={opt.label}
                      onChange={(e) => updateOption(idx, "label", e.target.value)}
                      placeholder="Label"
                      className="flex-1"
                    />
                    <Input
                      value={opt.value}
                      onChange={(e) => updateOption(idx, "value", e.target.value)}
                      placeholder="Value"
                      className="flex-1 font-mono text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-red-600 shrink-0"
                      onClick={() => removeOption(idx)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addOption}>
                  <Plus className="size-3.5 mr-1" />
                  Add Option
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
              {editingField ? "Save Changes" : "Create Field"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
