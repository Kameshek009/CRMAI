"use client";

import { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string | null;
}

interface EmailComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType?: "contact" | "deal" | "lead";
  entityId?: string;
  defaultTo?: string;
  defaultFrom?: string;
  onSent?: () => void;
  /** Context variables for template interpolation */
  templateContext?: Record<string, string>;
}

const selectClasses = "flex h-9 w-full rounded-md border border-input bg-transparent px-4 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function interpolateTemplate(text: string, ctx: Record<string, string>): string {
  return text.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, key: string) => {
    return ctx[key] || match;
  });
}

export function EmailComposer({
  open,
  onOpenChange,
  entityType,
  entityId,
  defaultTo,
  defaultFrom,
  onSent,
  templateContext,
}: EmailComposerProps) {
  const { t } = useTranslation();
  const [to, setTo] = useState(defaultTo || "");
  const [from, setFrom] = useState(defaultFrom || "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    if (open) {
      fetch("/api/crm/email-templates")
        .then((r) => r.json())
        .then((json) => {
          if (json.success) setTemplates(json.data || []);
        })
        .catch(() => {});
    }
  }, [open]);

  const applyTemplate = (tpl: EmailTemplate) => {
    const ctx = templateContext || {};
    setSubject(interpolateTemplate(tpl.subject, ctx));
    setBody(interpolateTemplate(tpl.body, ctx));
    setShowTemplates(false);
  };

  const handleSend = async () => {
    if (!to.trim() || !from.trim()) {
      toast.error(t("crm.emails.toAndFromRequired"));
      return;
    }

    setIsSending(true);
    try {
      const payload: Record<string, unknown> = {
        from_email: from.trim(),
        to_emails: to.split(",").map(e => e.trim()).filter(Boolean),
        subject: subject.trim(),
        body_text: body.trim(),
        direction: "outbound",
        status: "sent",
      };
      if (entityType && entityId) {
        payload[`${entityType}_id`] = entityId;
      }

      const res = await fetch("/api/crm/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(t("crm.emails.logged"));
        setTo(defaultTo || "");
        setSubject("");
        setBody("");
        onOpenChange(false);
        onSent?.();
      } else {
        toast.error(json.error || t("crm.emails.failedSend"));
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-base">{t("crm.emails.composeTitle")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Template selector */}
          {templates.length > 0 && (
            <div>
              {showTemplates ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">{t("crm.emails.selectTemplate")}</Label>
                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setShowTemplates(false)}>
                      Cancel
                    </Button>
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1 rounded-lg border p-2">
                    {templates.map((tpl) => (
                      <button
                        key={tpl.id}
                        onClick={() => applyTemplate(tpl)}
                        className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-muted/50 transition-colors"
                      >
                        <span className="font-medium">{tpl.name}</span>
                        {tpl.category && <span className="text-xs text-muted-foreground ml-2">({tpl.category})</span>}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => setShowTemplates(true)}>
                  <FileText className="size-3" />
                  {t("crm.emails.useTemplate")}
                </Button>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm">{t("crm.emails.from")}</Label>
            <Input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="you@company.com" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">{t("crm.emails.to")}</Label>
            <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="recipient@example.com" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">{t("crm.emails.subject")}</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">{t("crm.emails.body")}</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t("crm.emails.bodyPlaceholder")}
              rows={8}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button size="sm" onClick={handleSend} disabled={isSending}>
            {isSending ? t("crm.emails.sending") : t("crm.emails.send")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
