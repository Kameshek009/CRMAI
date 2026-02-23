"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "@/lib/i18n";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Trash2, Globe, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";

interface FormField {
  name: string;
  label: string;
  type: "text" | "email" | "phone" | "textarea" | "select";
  required?: boolean;
  options?: string[];
}

interface WebForm {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  fields: FormField[];
  success_message: string;
  redirect_url: string | null;
  primary_color: string;
  is_active: boolean;
  created_at: string;
}

const DEFAULT_FIELDS: FormField[] = [
  { name: "first_name", label: "First Name", type: "text", required: true },
  { name: "last_name", label: "Last Name", type: "text" },
  { name: "email", label: "Email", type: "email", required: true },
  { name: "phone", label: "Phone", type: "phone" },
  { name: "organization", label: "Company", type: "text" },
  { name: "message", label: "Message", type: "textarea" },
];

const FIELD_TYPES = ["text", "email", "phone", "textarea", "select"] as const;

export function WebFormsSection() {
  const { t } = useTranslation();
  const [forms, setForms] = useState<WebForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteFormId, setDeleteFormId] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [successMessage, setSuccessMessage] = useState("Thank you!");
  const [primaryColor, setPrimaryColor] = useState("#3b82f6");
  const [fields, setFields] = useState<FormField[]>(DEFAULT_FIELDS);

  const fetchForms = useCallback(async () => {
    try {
      const res = await fetch("/api/crm/web-forms");
      const json = await res.json();
      if (json.success) setForms(json.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchForms(); }, [fetchForms]);

  const openCreate = () => {
    setEditingId(null);
    setName("");
    setDescription("");
    setSuccessMessage("Thank you!");
    setPrimaryColor("#3b82f6");
    setFields(DEFAULT_FIELDS);
    setDialogOpen(true);
  };

  const openEdit = (form: WebForm) => {
    setEditingId(form.id);
    setName(form.name);
    setDescription(form.description || "");
    setSuccessMessage(form.success_message);
    setPrimaryColor(form.primary_color);
    setFields(form.fields.length > 0 ? form.fields : DEFAULT_FIELDS);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(t("settings.webForms.nameRequired"));
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        success_message: successMessage.trim(),
        primary_color: primaryColor,
        fields,
      };

      if (editingId) {
        const res = await fetch(`/api/crm/web-forms/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (json.success) {
          toast.success(t("settings.webForms.saved"));
          setDialogOpen(false);
          fetchForms();
        } else {
          toast.error(json.error);
        }
      } else {
        const res = await fetch("/api/crm/web-forms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (json.success) {
          toast.success(t("settings.webForms.saved"));
          setDialogOpen(false);
          fetchForms();
        } else {
          toast.error(json.error);
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteFormId) return;
    try {
      const res = await fetch(`/api/crm/web-forms/${deleteFormId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success(t("settings.webForms.deleted"));
        fetchForms();
      } else {
        toast.error(json.error);
      }
    } catch {
      toast.error(t("common.failed"));
    } finally {
      setDeleteFormId(null);
    }
  };

  const handleToggleActive = async (form: WebForm) => {
    try {
      const res = await fetch(`/api/crm/web-forms/${form.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !form.is_active }),
      });
      const json = await res.json();
      if (json.success) {
        fetchForms();
      } else {
        toast.error(json.error || t("common.failed"));
      }
    } catch {
      toast.error(t("common.failed"));
    }
  };

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/f/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success(t("settings.webForms.copied"));
  };

  const addField = () => {
    setFields([...fields, { name: `field_${fields.length + 1}`, label: "", type: "text" }]);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    setFields(fields.map((f, i) => i === index ? { ...f, ...updates } : f));
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t("settings.webForms.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("settings.webForms.description")}</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4 mr-1.5" />
          {t("settings.webForms.create")}
        </Button>
      </div>
      <Separator />

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : forms.length === 0 ? (
        <div className="text-center py-8">
          <Globe className="size-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{t("settings.webForms.noForms")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {forms.map((form) => (
            <div key={form.id} className="flex items-center gap-3 rounded-lg border p-3 group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{form.name}</span>
                  <Badge variant={form.is_active ? "default" : "secondary"} className="text-[10px]">
                    {form.is_active ? t("settings.webForms.active") : t("settings.webForms.inactive")}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">/f/{form.slug}</p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="size-7" onClick={() => copyLink(form.slug)} title={t("settings.webForms.copyLink")}>
                  <Copy className="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="size-7" asChild>
                  <a href={`/f/${form.slug}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-3.5" />
                  </a>
                </Button>
                <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(form)}>
                  <Pencil className="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="size-7 text-red-600 hover:text-red-700" onClick={() => setDeleteFormId(form.id)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
              <Switch checked={form.is_active} onCheckedChange={() => handleToggleActive(form)} />
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? t("settings.webForms.edit") : t("settings.webForms.create")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Basic info */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("settings.webForms.formName")}</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Contact Us" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("settings.webForms.formDescription")}</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Fill out this form and we'll get back to you" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("settings.webForms.successMessage")}</label>
                <Input value={successMessage} onChange={(e) => setSuccessMessage(e.target.value)} placeholder="Thank you!" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("settings.webForms.color")}</label>
                <div className="flex gap-2">
                  <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-9 w-12 rounded border cursor-pointer" />
                  <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="flex-1" />
                </div>
              </div>
            </div>

            <Separator />

            {/* Fields editor */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium">{t("settings.webForms.fields")}</label>
                <Button variant="outline" size="sm" onClick={addField}>
                  <Plus className="size-3.5 mr-1" />
                  {t("settings.webForms.addField")}
                </Button>
              </div>
              <div className="space-y-2">
                {fields.map((field, i) => (
                  <div key={i} className="flex items-center gap-2 rounded border p-2">
                    <Input
                      value={field.name}
                      onChange={(e) => updateField(i, { name: e.target.value })}
                      placeholder="field_name"
                      className="w-28 text-xs"
                    />
                    <Input
                      value={field.label}
                      onChange={(e) => updateField(i, { label: e.target.value })}
                      placeholder="Label"
                      className="flex-1 text-xs"
                    />
                    <select
                      value={field.type}
                      onChange={(e) => updateField(i, { type: e.target.value as FormField["type"] })}
                      className="h-9 rounded-md border border-input bg-background px-2 text-xs"
                    >
                      {FIELD_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={field.required || false}
                        onChange={(e) => updateField(i, { required: e.target.checked })}
                      />
                      {t("settings.webForms.required")}
                    </label>
                    <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={() => removeField(i)}>
                      <Trash2 className="size-3.5 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin mr-2" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteFormId}
        onOpenChange={(open) => { if (!open) setDeleteFormId(null); }}
        title={t("settings.webForms.deleteTitle")}
        description={t("settings.webForms.deleteConfirm")}
        confirmLabel={t("common.delete")}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
