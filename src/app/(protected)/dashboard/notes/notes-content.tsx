"use client";

import { useState, useEffect, useCallback } from "react";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { NoteEditor } from "@/components/crm/note-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Pin, Pencil, Trash2, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

// ============================================================================
// Types
// ============================================================================

interface NoteData {
  id: string;
  content: string;
  created_at: string;
  is_pinned: boolean;
  contact_id: string | null;
  deal_id: string | null;
  company_id: string | null;
}

// ============================================================================
// Component
// ============================================================================

export function NotesContent() {
  const { t } = useTranslation();
  const [notes, setNotes] = useState<NoteData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/crm/notes?limit=100");
      const json = await res.json();
      if (json.success) setNotes(json.data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const handleAddNote = async (content: string) => {
    const res = await fetch("/api/crm/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    const json = await res.json();
    if (json.success) {
      setNotes([json.data, ...notes]);
      toast.success(t("notes.added"));
    }
  };

  const handleEdit = (note: NoteData) => {
    setEditingId(note.id);
    setEditContent(note.content);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent("");
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editContent.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/crm/notes/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        setNotes(prev => prev.map(n => n.id === editingId ? { ...n, content: editContent.trim() } : n));
        toast.success(t("notes.updated"));
        setEditingId(null);
        setEditContent("");
      } else {
        toast.error(json.error || t("common.failed"));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/crm/notes/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setNotes(prev => prev.filter(n => n.id !== id));
        toast.success(t("notes.deleted"));
      } else {
        toast.error(json.error || t("common.failed"));
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleTogglePin = async (note: NoteData) => {
    const res = await fetch(`/api/crm/notes/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_pinned: !note.is_pinned }),
    });
    const json = await res.json();
    if (json.success) {
      setNotes(prev => {
        const updated = prev.map(n => n.id === note.id ? { ...n, is_pinned: !n.is_pinned } : n);
        return updated.sort((a, b) => {
          if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
      });
    }
  };

  const getLinkedEntity = (note: NoteData) => {
    if (note.contact_id) return { label: t("notes.linked.contact"), href: `/dashboard/contacts/${note.contact_id}` };
    if (note.deal_id) return { label: t("notes.linked.deal"), href: `/dashboard/deals/${note.deal_id}` };
    if (note.company_id) return { label: t("notes.linked.organization"), href: `/dashboard/companies/${note.company_id}` };
    return null;
  };

  return (
    <PageContainer>
      <PageHeader title={t("notes.title")} description={`${notes.length}`} />

      <div className="max-w-2xl space-y-6">
        <NoteEditor onSubmit={handleAddNote} placeholder={t("notes.placeholder")} />

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
        ) : notes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">{t("notes.empty")}</p>
        ) : (
          <div className="space-y-4">
            {notes.map(note => {
              const linked = getLinkedEntity(note);
              const isEditing = editingId === note.id;
              const isDeleting = deletingId === note.id;

              return (
                <div
                  key={note.id}
                  className={cn(
                    "border-l-2 pl-4 py-2 group transition-colors",
                    note.is_pinned ? "border-primary/40" : "border-muted-foreground/20"
                  )}
                >
                  {isEditing ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={3}
                        className="resize-none text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault();
                            handleSaveEdit();
                          }
                          if (e.key === "Escape") handleCancelEdit();
                        }}
                      />
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={handleSaveEdit} disabled={!editContent.trim() || isSaving}>
                          {isSaving ? <Loader2 className="size-3.5 mr-1 animate-spin" /> : <Check className="size-3.5 mr-1" />}
                          {t("notes.save")}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={handleCancelEdit} disabled={isSaving}>
                          <X className="size-3.5 mr-1" />
                          {t("notes.cancel")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm whitespace-pre-wrap flex-1">{note.content}</p>
                        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => handleTogglePin(note)}
                            title={note.is_pinned ? t("notes.unpin") : t("notes.pin")}
                          >
                            <Pin className={cn("size-3.5", note.is_pinned && "text-primary fill-primary")} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => handleEdit(note)}
                            title={t("notes.edit")}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(note.id)}
                            disabled={isDeleting}
                            title={t("notes.delete")}
                          >
                            {isDeleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground">
                          {new Date(note.created_at).toLocaleDateString("ru-RU", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                        {linked && (
                          <Link href={linked.href}>
                            <Badge variant="secondary" className="text-xs">{linked.label}</Badge>
                          </Link>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
