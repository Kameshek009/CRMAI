"use client";

import { useState, useEffect, useCallback } from "react";
import { InlineEditField } from "@/components/frappe/inline-edit-field";
import { useTranslation } from "@/lib/i18n";
import type { CustomFieldDefinition } from "@/lib/crm/field-definitions";

interface CustomFieldsPanelProps {
  entityType: "contact" | "company" | "deal" | "lead";
  metadata: Record<string, unknown> | null;
  onUpdateMetadata: (key: string, value: string) => Promise<void>;
  disabled?: boolean;
}

const FIELD_TYPE_TO_INLINE: Record<string, "text" | "email" | "tel" | "url" | "number" | "select" | "date" | "boolean" | "textarea"> = {
  text: "text",
  number: "number",
  date: "date",
  select: "select",
  multi_select: "select",
  url: "url",
  email: "email",
  phone: "tel",
  boolean: "boolean",
  currency: "number",
  percent: "number",
  textarea: "textarea",
};

export function CustomFieldsPanel({
  entityType,
  metadata,
  onUpdateMetadata,
  disabled = false,
}: CustomFieldsPanelProps) {
  const { t } = useTranslation();
  const [fields, setFields] = useState<CustomFieldDefinition[]>([]);

  useEffect(() => {
    fetch(`/api/crm/fields?entity_type=${entityType}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          setFields(json.data);
        }
      })
      .catch(() => {});
  }, [entityType]);

  const handleSave = useCallback(
    async (fieldKey: string, value: string) => {
      await onUpdateMetadata(fieldKey, value);
    },
    [onUpdateMetadata]
  );

  if (fields.length === 0) return null;

  return (
    <div className="pt-2 border-t border-border">
      <div className="text-xs text-muted-foreground mb-2 font-medium">{t("common.customFields")}</div>
      {fields.map((field) => {
        const inlineType = FIELD_TYPE_TO_INLINE[field.field_type] || "text";
        const currentValue = metadata?.[field.field_key] as string | number | null ?? null;

        if (inlineType === "select") {
          return (
            <InlineEditField
              key={field.id}
              label={field.label}
              value={currentValue}
              type="select"
              options={field.options?.map((o) => ({ value: o.value, label: o.label })) || []}
              onSave={(v) => handleSave(field.field_key, v)}
              disabled={disabled}
            />
          );
        }

        if (inlineType === "boolean") {
          return (
            <InlineEditField
              key={field.id}
              label={field.label}
              value={currentValue}
              type="boolean"
              onSave={(v) => handleSave(field.field_key, v)}
              disabled={disabled}
            />
          );
        }

        if (inlineType === "date") {
          return (
            <InlineEditField
              key={field.id}
              label={field.label}
              value={currentValue}
              type="date"
              onSave={(v) => handleSave(field.field_key, v)}
              disabled={disabled}
            />
          );
        }

        if (inlineType === "textarea") {
          return (
            <InlineEditField
              key={field.id}
              label={field.label}
              value={currentValue}
              type="textarea"
              onSave={(v) => handleSave(field.field_key, v)}
              disabled={disabled}
            />
          );
        }

        return (
          <InlineEditField
            key={field.id}
            label={field.label}
            value={currentValue}
            type={inlineType}
            onSave={(v) => handleSave(field.field_key, v)}
            disabled={disabled}
          />
        );
      })}
    </div>
  );
}
