"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/dashboard/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivityTimeline } from "@/components/crm/activity-timeline";
import { NoteEditor } from "@/components/crm/note-editor";
import { ArrowLeft, DollarSign, Calendar, User, Building2, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface DealDetailContentProps {
  dealId: string;
}

export function DealDetailContent({ dealId }: DealDetailContentProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deal, setDeal] = useState<Record<string, any> | null>(null);
  const [activities, setActivities] = useState<{ id: string; type: string; title: string; description?: string | null; created_at: string }[]>([]);
  const [notes, setNotes] = useState<{ id: string; content: string; created_at: string; is_pinned: boolean }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/crm/deals/${dealId}`).then((r) => r.json()),
      fetch(`/api/crm/activities?deal_id=${dealId}&limit=20`).then((r) => r.json()),
      fetch(`/api/crm/notes?deal_id=${dealId}&limit=20`).then((r) => r.json()),
    ]).then(([dealRes, actRes, notesRes]) => {
      if (dealRes.success) setDeal(dealRes.data);
      if (actRes.success) setActivities(actRes.data);
      if (notesRes.success) setNotes(notesRes.data);
      setIsLoading(false);
    });
  }, [dealId]);

  const handleAddNote = async (content: string) => {
    const res = await fetch("/api/crm/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, deal_id: dealId }),
    });
    const json = await res.json();
    if (json.success) {
      setNotes([json.data, ...notes]);
      toast.success("Note added");
    }
  };

  if (isLoading) return <PageContainer><Skeleton className="h-64 w-full" /></PageContainer>;
  if (!deal) return <PageContainer><p>Deal not found</p></PageContainer>;

  const stage = deal.deal_stages as Record<string, unknown> | null;
  const contact = deal.contacts as Record<string, unknown> | null;
  const company = deal.companies as Record<string, unknown> | null;

  return (
    <PageContainer>
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/pipeline"><ArrowLeft className="size-4 mr-1" />Back to Pipeline</Link>
        </Button>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">{String(deal.title)}</h1>
        <div className="flex items-center gap-3 mt-2">
          <Badge>{String(deal.status)}</Badge>
          {stage && (
            <Badge variant="outline" style={{ borderColor: String(stage.color) }}>
              {String(stage.name)}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm">Deal Info</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="size-4 text-muted-foreground" />
              <span className="text-lg font-bold">${Number(deal.value).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="size-4 text-muted-foreground" />
              Win probability: {Number(deal.ai_win_probability)}%
            </div>
            {deal.expected_close_date && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="size-4 text-muted-foreground" />
                Expected: {new Date(String(deal.expected_close_date)).toLocaleDateString()}
              </div>
            )}
            {contact && (
              <div className="flex items-center gap-2 text-sm">
                <User className="size-4 text-muted-foreground" />
                <Link href={`/dashboard/contacts/${contact.id}`} className="hover:underline">
                  {String(contact.first_name)} {String(contact.last_name || "")}
                </Link>
              </div>
            )}
            {company && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="size-4 text-muted-foreground" />
                <Link href={`/dashboard/companies/${company.id}`} className="hover:underline">
                  {String(company.name)}
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <NoteEditor onSubmit={handleAddNote} />
              {notes.map((note) => (
                <div key={note.id} className="border-l-2 border-muted pl-3 py-1">
                  <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(note.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Activity</CardTitle></CardHeader>
            <CardContent>
              <ActivityTimeline activities={activities} />
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
