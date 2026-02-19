"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

export interface FormField {
  name: string;
  label: string;
  type: "text" | "email" | "tel" | "number" | "textarea" | "select" | "date" | "url" | "boolean";
  placeholder?: string;
  required?: boolean;
  options?: { label: string; value: string }[];
}

interface EntityFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fields: FormField[];
  initialValues?: Record<string, string>;
  onSubmit: (values: Record<string, string>) => Promise<void>;
  submitLabel?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateField(field: FormField, value: string, t: (key: string, params?: Record<string, string | number>) => string): string | null {
  const trimmed = value.trim();
  if (field.required && !trimmed) {
    return t("crm.entityForm.required", { field: field.label });
  }
  if (field.type === "email" && trimmed && !EMAIL_REGEX.test(trimmed)) {
    return t("crm.entityForm.invalidEmail");
  }
  if (field.type === "tel" && trimmed && trimmed.length > 20) {
    return t("crm.entityForm.phoneTooLong");
  }
  return null;
}

export function EntityForm({
  open,
  onOpenChange,
  title,
  fields,
  initialValues = {},
  onSubmit,
  submitLabel,
}: EntityFormProps) {
  const { t } = useTranslation();
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const prevOpenRef = useRef(false);

  useEffect(() => {
    // Only reset values when dialog opens (false → true), not on every render
    if (open && !prevOpenRef.current) {
      setValues(initialValues);
      setErrors({});
      setTouched({});
    }
    prevOpenRef.current = open;
  }, [open, initialValues]);

  const validateAll = (): boolean => {
    const newErrors: Record<string, string> = {};
    fields.forEach((field) => {
      const error = validateField(field, values[field.name] || "", t);
      if (error) newErrors[field.name] = error;
    });
    setErrors(newErrors);
    setTouched(Object.fromEntries(fields.map((f) => [f.name, true])));
    return Object.keys(newErrors).length === 0;
  };

  const handleBlur = (field: FormField) => {
    setTouched((prev) => ({ ...prev, [field.name]: true }));
    const error = validateField(field, values[field.name] || "", t);
    setErrors((prev) => {
      if (error) return { ...prev, [field.name]: error };
      const next = { ...prev };
      delete next[field.name];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) return;
    setIsSubmitting(true);
    try {
      // Separate metadata.* fields into a nested metadata object
      const payload: Record<string, string> = {};
      const metadata: Record<string, string> = {};
      for (const [key, val] of Object.entries(values)) {
        if (key.startsWith("metadata.")) {
          const metaKey = key.slice("metadata.".length);
          if (val) metadata[metaKey] = val;
        } else {
          payload[key] = val;
        }
      }
      if (Object.keys(metadata).length > 0) {
        payload.metadata = JSON.stringify(metadata);
      }
      await onSubmit(payload);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => {
            const fieldId = `entity-form-${field.name}`;
            const error = touched[field.name] ? errors[field.name] : undefined;
            return (
              <div key={field.name} className="space-y-2">
                <label htmlFor={fieldId} className="text-sm font-medium">
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </label>
                {field.type === "boolean" ? (
                  <div className="flex items-center gap-2 h-9">
                    <Switch
                      id={fieldId}
                      checked={values[field.name] === "true"}
                      onCheckedChange={(checked) =>
                        setValues({ ...values, [field.name]: checked ? "true" : "false" })
                      }
                    />
                    <span className="text-sm text-muted-foreground">
                      {values[field.name] === "true" ? t("crm.entityForm.yes") : t("crm.entityForm.no")}
                    </span>
                  </div>
                ) : field.type === "textarea" ? (
                  <Textarea
                    id={fieldId}
                    value={values[field.name] || ""}
                    onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
                    onBlur={() => handleBlur(field)}
                    placeholder={field.placeholder}
                    rows={3}
                    className={cn(error && "border-destructive focus-visible:ring-destructive")}
                  />
                ) : field.type === "select" ? (
                  <select
                    id={fieldId}
                    value={values[field.name] || ""}
                    onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
                    onBlur={() => handleBlur(field)}
                    className={cn(
                      "flex h-9 w-full rounded-md border border-input bg-transparent px-4 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                      error && "border-destructive focus-visible:ring-destructive"
                    )}
                  >
                    <option value="">{t("crm.entityForm.select")}</option>
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id={fieldId}
                    type={field.type === "url" ? "url" : field.type}
                    value={values[field.name] || ""}
                    onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
                    onBlur={() => handleBlur(field)}
                    placeholder={field.placeholder}
                    className={cn(error && "border-destructive focus-visible:ring-destructive")}
                    aria-invalid={!!error}
                    aria-describedby={error ? `${fieldId}-error` : undefined}
                  />
                )}
                {error && (
                  <p id={`${fieldId}-error`} className="text-xs text-destructive" role="alert">
                    {error}
                  </p>
                )}
              </div>
            );
          })}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("crm.entityForm.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 mr-2 animate-spin" />}
              {submitLabel || t("crm.entityForm.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
