"use client";

import { useState, useEffect, useCallback } from "react";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { NoteEditor } from "@/components/crm/note-editor";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Pin } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

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
  lead_id: string | null;
}

// ============================================================================
// Component
// ============================================================================

export function NotesContent() {
  const [notes, setNotes] = useState<NoteData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      toast.success("Note added");
    }
  };

  const getLinkedEntity = (note: NoteData) => {
    if (note.contact_id) return { label: "Contact", href: `/dashboard/contacts/${note.contact_id}` };
    if (note.deal_id) return { label: "Deal", href: `/dashboard/deals/${note.deal_id}` };
    if (note.company_id) return { label: "Organization", href: `/dashboard/companies/${note.company_id}` };
    if (note.lead_id) return { label: "Lead", href: `/dashboard/leads/${note.lead_id}` };
    return null;
  };

  return (
    <PageContainer>
      <PageHeader title="Notes" description={`${notes.length} note${notes.length !== 1 ? "s" : ""}`} />

      <div className="max-w-2xl space-y-6">
        <NoteEditor onSubmit={handleAddNote} placeholder="Write a note..." />

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
        ) : notes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No notes yet</p>
        ) : (
          <div className="space-y-4">
            {notes.map(note => {
              const linked = getLinkedEntity(note);
              return (
                <div key={note.id} className="border-l-2 border-muted-foreground/20 pl-4 py-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm whitespace-pre-wrap flex-1">{note.content}</p>
                    {note.is_pinned && <Pin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground">
                      {new Date(note.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                    {linked && (
                      <Link href={linked.href}>
                        <Badge variant="secondary" className="text-xs">{linked.label}</Badge>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
