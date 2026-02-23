"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, FileText, Send } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface Template {
  id: string;
  name: string;
  language: string;
  category: string;
  components: {
    type: string;
    text?: string;
    example?: { body_text?: string[][] };
  }[];
}

interface WhatsAppTemplatePickerProps {
  onSelect: (templateName: string, params: string[]) => void;
  onClose: () => void;
}

export function WhatsAppTemplatePicker({ onSelect, onClose }: WhatsAppTemplatePickerProps) {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<Template | null>(null);
  const [params, setParams] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/crm/whatsapp/templates")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setTemplates(json.data || []);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const handleSelect = (template: Template) => {
    setSelected(template);
    // Count {{1}}, {{2}}, etc. in body text
    const bodyComponent = template.components.find((c) => c.type === "BODY");
    const bodyText = bodyComponent?.text || "";
    const matches = bodyText.match(/\{\{\d+\}\}/g);
    setParams(new Array(matches?.length || 0).fill(""));
  };

  const handleSend = () => {
    if (!selected) return;
    onSelect(selected.name, params);
  };

  const getBodyText = (template: Template): string => {
    const body = template.components.find((c) => c.type === "BODY");
    return body?.text || "";
  };

  const getPreview = (template: Template): string => {
    let text = getBodyText(template);
    params.forEach((p, i) => {
      text = text.replace(`{{${i + 1}}}`, p || `{{${i + 1}}}`);
    });
    return text;
  };

  if (isLoading) {
    return (
      <div className="border-t p-3 text-center text-xs text-muted-foreground">
        {t("crm.whatsapp.loading")}
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="border-t p-3 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{t("crm.whatsapp.noTemplates")}</p>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  if (!selected) {
    return (
      <div className="border-t">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-xs font-medium">{t("crm.whatsapp.selectTemplate")}</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
        <ScrollArea className="max-h-[200px]">
          <div className="p-2 space-y-1">
            {templates.map((tmpl) => (
              <button
                key={tmpl.id}
                className="w-full text-left rounded-md p-2 hover:bg-muted transition-colors"
                onClick={() => handleSelect(tmpl)}
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{tmpl.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{getBodyText(tmpl)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="border-t p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">{selected.name}</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelected(null)}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Preview */}
      <div className="rounded-md bg-muted p-2 text-xs whitespace-pre-wrap">
        {getPreview(selected)}
      </div>

      {/* Params */}
      {params.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs">{t("crm.whatsapp.fillParams")}</Label>
          {params.map((p, i) => (
            <Input
              key={i}
              size={1}
              placeholder={`{{${i + 1}}}`}
              value={p}
              onChange={(e) => {
                const updated = [...params];
                updated[i] = e.target.value;
                setParams(updated);
              }}
              className="h-7 text-xs"
            />
          ))}
        </div>
      )}

      <Button size="sm" className="w-full" onClick={handleSend}>
        <Send className="h-3.5 w-3.5 mr-1.5" />
        {t("crm.whatsapp.sendTemplate")}
      </Button>
    </div>
  );
}
