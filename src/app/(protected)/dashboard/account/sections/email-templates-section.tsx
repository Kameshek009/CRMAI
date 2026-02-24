"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "@/lib/i18n";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Trash2, Mail } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string | null;
  created_at: string;
}

const CATEGORIES = ["sales", "followup", "onboarding", "custom"] as const;

const VARIABLES = [
  "{first_name}",
  "{last_name}",
  "{company}",
  "{deal_title}",
  "{deal_value}",
  "{email}",
];

export function EmailTemplatesSection() {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<string>("sales");

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/crm/email-templates");
      const json = await res.json();
      if (json.success) setTemplates(json.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const openCreate = () => {
    setEditingId(null);
    setName("");
    setSubject("");
    setBody("");
    setCategory("sales");
    setDialogOpen(true);
  };

  const openEdit = (tpl: EmailTemplate) => {
    setEditingId(tpl.id);
    setName(tpl.name);
    setSubject(tpl.subject);
    setBody(tpl.body);
    setCategory(tpl.category || "custom");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !body.trim()) {
      toast.error(t("settings.emailTemplates.required"));
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        const res = await fetch(`/api/crm/email-templates/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), subject: subject.trim(), body: body.trim(), category }),
        });
        const json = await res.json();
        if (json.success) {
          toast.success(t("settings.emailTemplates.saved"));
          setDialogOpen(false);
          fetchTemplates();
        } else {
          toast.error(json.error);
        }
      } else {
        const res = await fetch("/api/crm/email-templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), subject: subject.trim(), body: body.trim(), category }),
        });
        const json = await res.json();
        if (json.success) {
          toast.success(t("settings.emailTemplates.saved"));
          setDialogOpen(false);
          fetchTemplates();
        } else {
          toast.error(json.error);
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTemplateId) return;
    try {
      const res = await fetch(`/api/crm/email-templates/${deleteTemplateId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success(t("settings.emailTemplates.deleted"));
        fetchTemplates();
      } else {
        toast.error(json.error);
      }
    } catch {
      toast.error(t("common.failed"));
    } finally {
      setDeleteTemplateId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t("settings.emailTemplates.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("settings.emailTemplates.description")}</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4 mr-1.5" />
          {t("settings.emailTemplates.create")}
        </Button>
      </div>
      <Separator />

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-8">
          <Mail className="size-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{t("settings.emailTemplates.noTemplates")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map((tpl) => (
            <div key={tpl.id} className="flex items-center gap-3 rounded-lg border p-3 group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{tpl.name}</span>
                  {tpl.category && (
                    <Badge variant="outline" className="text-[10px]">
                      {t(`settings.emailTemplates.categories.${tpl.category}`)}
                    </Badge>
                  )}
                </div>
                {tpl.subject && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{tpl.subject}</p>
                )}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(tpl)}>
                  <Pencil className="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="size-7 text-red-600 hover:text-red-700" onClick={() => setDeleteTemplateId(tpl.id)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? t("settings.emailTemplates.edit") : t("settings.emailTemplates.create")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("settings.emailTemplates.name")}</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("settings.emailTemplates.placeholders.name")} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("settings.emailTemplates.subject")}</label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t("settings.emailTemplates.placeholders.subject")} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("settings.emailTemplates.category")}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{t(`settings.emailTemplates.categories.${c}`)}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("settings.emailTemplates.body")}</label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={t("settings.emailTemplates.placeholders.body")}
                rows={6}
              />
              <div className="flex flex-wrap gap-1">
                <span className="text-xs text-muted-foreground mr-1">{t("settings.emailTemplates.variables")}:</span>
                {VARIABLES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setBody((prev) => prev + v)}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 font-mono"
                  >
                    {v}
                  </button>
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
        open={!!deleteTemplateId}
        onOpenChange={(open) => { if (!open) setDeleteTemplateId(null); }}
        title={t("settings.emailTemplates.deleteTitle")}
        description={t("settings.emailTemplates.deleteConfirm")}
        confirmLabel={t("common.delete")}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
