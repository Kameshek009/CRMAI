"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

const MAX_NOTE_LENGTH = 10000;

interface NoteEditorProps {
  onSubmit: (content: string) => Promise<void>;
  placeholder?: string;
}

export function NoteEditor({ onSubmit, placeholder }: NoteEditorProps) {
  const { t } = useTranslation();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmed = content.trim();
  const charCount = trimmed.length;
  const isOverLimit = charCount > MAX_NOTE_LENGTH;
  const canSubmit = charCount > 0 && !isOverLimit && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      await onSubmit(trimmed);
      setContent("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-2">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder || t("notes.placeholder")}
        rows={3}
        className={cn("resize-none", isOverLimit && "border-destructive focus-visible:ring-destructive")}
        aria-label="Note content"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleSubmit();
          }
        }}
      />
      <div className="flex items-center justify-between">
        <span className={cn(
          "text-xs",
          isOverLimit ? "text-destructive" : charCount > MAX_NOTE_LENGTH * 0.9 ? "text-amber-500" : "text-muted-foreground"
        )}>
          {charCount > 0 && `${charCount.toLocaleString()} / ${MAX_NOTE_LENGTH.toLocaleString()}`}
        </span>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {isSubmitting ? <Loader2 className="size-4 mr-1 animate-spin" /> : <Send className="size-4 mr-1" />}
          {t("notes.addNote")}
        </Button>
      </div>
    </div>
  );
}
