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
import { EntityForm } from "@/components/crm/entity-form";
import { dealFields } from "@/lib/crm/field-definitions";
import { StageSelector } from "@/components/crm/stage-selector";
import { ArrowLeft, DollarSign, Calendar, User, Building2, TrendingUp, Pencil, CheckSquare } from "lucide-react";
import { toast } from "sonner";

interface DealStage {
  id: string;
  name: string;
  color: string;
  position: number;
  is_won?: boolean;
  is_lost?: boolean;
}

interface DealContact {
  id: string;
  first_name: string;
  last_name: string | null;
}

interface DealCompany {
  id: string;
  name: string;
}

interface Deal {
  id: string;
  title: string;
  value: number | null;
  status: string | null;
  description: string | null;
  expected_close_date: string | null;
  actual_close_date: string | null;
  ai_win_probability: number | null;
  stage_id: string;
  created_at: string | null;
  deal_stages: DealStage | null;
  contacts: DealContact | null;
  companies: DealCompany | null;
}

interface DealTask {
  id: string;
  title: string;
  status: string | null;
  due_date: string | null;
  priority: string | null;
}

interface DealDetailContentProps {
  dealId: string;
}

export function DealDetailContent({ dealId }: DealDetailContentProps) {
  const [deal, setDeal] = useState<Deal | null>(null);
  const [activities, setActivities] = useState<{ id: string; type: string; title: string; description?: string | null; created_at: string }[]>([]);
  const [notes, setNotes] = useState<{ id: string; content: string; created_at: string; is_pinned: boolean }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [stages, setStages] = useState<DealStage[]>([]);
  const [tasks, setTasks] = useState<DealTask[]>([]);

  useEffect(() => {
    const safeFetch = (url: string) =>
      fetch(url)
        .then((r) => (r.ok ? r.json() : { success: false }))
        .catch(() => ({ success: false }));

    Promise.all([
      safeFetch(`/api/crm/deals/${dealId}`),
      safeFetch(`/api/crm/activities?deal_id=${dealId}&limit=20`),
      safeFetch(`/api/crm/notes?deal_id=${dealId}&limit=20`),
      safeFetch(`/api/crm/pipeline`),
      safeFetch(`/api/crm/tasks?deal_id=${dealId}&limit=10`),
    ]).then(([dealRes, actRes, notesRes, stagesRes, tasksRes]) => {
      if (dealRes.success) setDeal(dealRes.data);
      if (actRes.success) setActivities(actRes.data);
      if (notesRes.success) setNotes(notesRes.data);
      if (stagesRes.success) setStages(stagesRes.data);
      if (tasksRes.success) setTasks(tasksRes.data);
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

  const handleEdit = async (values: Record<string, string>) => {
    const res = await fetch(`/api/crm/deals/${dealId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const json = await res.json();
    if (json.success) {
      setDeal(json.data);
      toast.success("Deal updated");
    }
  };

  const handleStageChange = async (stageId: string) => {
    const res = await fetch(`/api/crm/deals/${dealId}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage_id: stageId }),
    });
    const json = await res.json();
    if (json.success) {
      setDeal(json.data);
      toast.success("Stage updated");
    }
  };

  if (isLoading) return <PageContainer><Skeleton className="h-64 w-full" /></PageContainer>;
  if (!deal) return <PageContainer><p>Deal not found</p></PageContainer>;

  const stage = deal.deal_stages;
  const contact = deal.contacts;
  const company = deal.companies;

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
          <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>
            <Pencil className="size-3.5 mr-1" />
            Edit
          </Button>
        </div>
        {stages.length > 0 && (
          <div className="mt-3 max-w-xs">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Change Stage</label>
            <StageSelector
              stages={stages}
              value={deal.stage_id || ""}
              onChange={handleStageChange}
            />
          </div>
        )}
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

          {/* Related Tasks */}
          {tasks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckSquare className="size-4" />
                  Tasks ({tasks.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div key={String(task.id)} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">{String(task.title)}</p>
                        {task.due_date && (
                          <p className="text-xs text-muted-foreground">
                            Due: {new Date(String(task.due_date)).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <Badge variant={task.status === "done" ? "default" : "secondary"}>
                        {String(task.status)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-sm">Activity</CardTitle></CardHeader>
            <CardContent>
              <ActivityTimeline activities={activities} />
            </CardContent>
          </Card>
        </div>
      </div>

      <EntityForm
        open={showEdit}
        onOpenChange={setShowEdit}
        title="Edit Deal"
        fields={dealFields}
        initialValues={{
          title: deal.title || "",
          value: String(deal.value || ""),
          expected_close_date: deal.expected_close_date || "",
          description: deal.description || "",
          status: deal.status || "",
        }}
        onSubmit={handleEdit}
        submitLabel="Save"
      />
    </PageContainer>
  );
}
