"use client";

import { cn } from "@/lib/utils";
import { Check, X, Pencil } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";

// ============================================================================
// Types
// ============================================================================

interface BaseFieldProps {
  label: string;
  value: string | number | null;
  onSave: (value: string) => Promise<void> | void;
  disabled?: boolean;
  className?: string;
}

interface TextFieldProps extends BaseFieldProps {
  type: "text" | "email" | "tel" | "url" | "number";
  placeholder?: string;
}

interface SelectFieldProps extends BaseFieldProps {
  type: "select";
  options: { value: string; label: string }[];
}

interface DateFieldProps extends BaseFieldProps {
  type: "date";
}

type InlineEditFieldProps = TextFieldProps | SelectFieldProps | DateFieldProps;

// ============================================================================
// Component
// ============================================================================

export function InlineEditField(props: InlineEditFieldProps) {
  const { label, value, onSave, disabled = false, className } = props;
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value ?? ""));
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select();
      }
    }
  }, [editing]);

  const startEdit = useCallback(() => {
    if (disabled) return;
    setEditValue(String(value ?? ""));
    setEditing(true);
  }, [value, disabled]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
    setEditValue(String(value ?? ""));
  }, [value]);

  const handleSave = useCallback(async () => {
    if (editValue === String(value ?? "")) {
      setEditing(false);
      return;
    }
    try {
      setSaving(true);
      await onSave(editValue);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }, [editValue, value, onSave]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleSave();
      if (e.key === "Escape") cancelEdit();
    },
    [handleSave, cancelEdit]
  );

  const displayValue = (() => {
    if (value == null || value === "") return "—";
    if (props.type === "select") {
      const opt = props.options.find((o) => o.value === String(value));
      return opt?.label || String(value);
    }
    return String(value);
  })();

  return (
    <div className={cn("group", className)}>
      <label className="text-xs text-muted-foreground mb-1 block">{label}</label>

      {editing ? (
        <div className="flex items-center gap-1">
          {props.type === "select" ? (
            <select
              ref={inputRef as React.RefObject<HTMLSelectElement | null>}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              disabled={saving}
              className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10"
            >
              <option value="">—</option>
              {props.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement | null>}
              type={props.type === "date" ? "date" : props.type}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={saving}
              placeholder={props.type !== "date" ? props.placeholder : undefined}
              className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10"
            />
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded p-1 text-emerald-500 hover:bg-emerald-500/10"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={cancelEdit}
            disabled={saving}
            className="rounded p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={startEdit}
          disabled={disabled}
          className={cn(
            "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm text-left transition-colors",
            disabled
              ? "cursor-default"
              : "hover:bg-muted cursor-pointer"
          )}
        >
          <span className={cn(value == null || value === "" ? "text-muted-foreground" : "text-foreground")}>
            {displayValue}
          </span>
          {!disabled && (
            <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          )}
        </button>
      )}
    </div>
  );
}
