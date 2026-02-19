"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/dashboard/page-container";
import { DetailLayout } from "@/components/frappe/detail-layout";
import { InlineEditField } from "@/components/frappe/inline-edit-field";
import { ActivityStream } from "@/components/frappe/activity-stream";
import { StatusBadge } from "@/components/frappe/status-badge";
import { NoteEditor } from "@/components/crm/note-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Handshake, CheckSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import type { Activity } from "@/types/crm";

// ============================================================================
// Types
// ============================================================================

interface DealStage {
  id: string;
  name: string;
  color: string;
  position: number;
  is_won?: boolean;
  is_lost?: boolean;
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
  contacts: { id: string; first_name: string; last_name: string | null } | null;
  companies: { id: string; name: string } | null;
}

interface DealTask {
  id: string;
  title: string;
  status: string | null;
  due_date: string | null;
  priority: string | null;
}

interface NoteData {
  id: string;
  content: string;
  created_at: string;
  is_pinned: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function DealDetailContent({ dealId }: { dealId: string }) {
  const router = useRouter();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [notes, setNotes] = useState<NoteData[]>([]);
  const [tasks, setTasks] = useState<DealTask[]>([]);
  const [stages, setStages] = useState<DealStage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const safeFetch = (url: string) =>
      fetch(url).then(r => r.ok ? r.json() : { success: false }).catch(() => ({ success: false }));

    Promise.all([
      safeFetch(`/api/crm/deals/${dealId}`),
      safeFetch(`/api/crm/activities?deal_id=${dealId}&limit=20`),
      safeFetch(`/api/crm/notes?deal_id=${dealId}&limit=20`),
      safeFetch(`/api/crm/tasks?deal_id=${dealId}&limit=10`),
      safeFetch(`/api/crm/pipeline`),
    ]).then(([dealRes, actRes, notesRes, tasksRes, stagesRes]) => {
      if (dealRes.success) setDeal(dealRes.data);
      if (actRes.success) {
        setActivities(actRes.data.map((a: Record<string, unknown>) => ({
          id: a.id as string,
          type: a.type as string,
          title: a.title as string,
          description: a.description as string | null,
          createdAt: a.created_at as string,
        })));
      }
      if (notesRes.success) setNotes(notesRes.data);
      if (tasksRes.success) setTasks(tasksRes.data);
      if (stagesRes.success) {
        setStages(stagesRes.data.sort((a: DealStage, b: DealStage) => a.position - b.position));
      }
      setIsLoading(false);
    });
  }, [dealId]);

  const updateField = useCallback(async (field: string, value: string) => {
    const res = await fetch(`/api/crm/deals/${dealId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value || null }),
    });
    const json = await res.json();
    if (json.success) {
      setDeal(json.data);
      toast.success("Updated");
    } else {
      toast.error("Failed to update");
    }
  }, [dealId]);

  const handleStageChange = async (stageId: string) => {
    const res = await fetch(`/api/crm/deals/${dealId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage_id: stageId }),
    });
    const json = await res.json();
    if (json.success) {
      setDeal(json.data);
      toast.success("Stage updated");
    } else {
      toast.error("Failed to update stage");
    }
  };

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

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/crm/deals/${dealId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Deal deleted");
        router.push("/dashboard/deals");
      } else {
        toast.error("Failed to delete");
      }
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-4 w-48 rounded" />
          <Skeleton className="h-8 w-64 rounded" />
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <Skeleton className="h-96 rounded-lg lg:col-span-3" />
            <Skeleton className="h-96 rounded-lg lg:col-span-2" />
          </div>
        </div>
      </PageContainer>
    );
  }

  if (!deal) {
    return <PageContainer><p className="text-muted-foreground">Deal not found</p></PageContainer>;
  }

  const formatCurrency = (value: number | null) => {
    if (value == null) return "—";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
  };

  const stage = deal.deal_stages;
  const stageOptions = stages.map(s => ({ value: s.id, label: s.name }));

  const tabs = [
    {
      value: "activity",
      label: "Activity",
      count: activities.length,
      content: (
        <ActivityStream
          activities={activities}
          emptyMessage="No activity yet"
        />
      ),
    },
    {
      value: "notes",
      label: "Notes",
      count: notes.length,
      content: (
        <div className="space-y-4">
          <NoteEditor onSubmit={handleAddNote} />
          {notes.map(note => (
            <div key={note.id} className="border-l-2 border-muted-foreground/20 pl-4 py-2">
              <p className="text-sm whitespace-pre-wrap">{note.content}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(note.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>
          ))}
          {notes.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">No notes yet</p>}
        </div>
      ),
    },
    {
      value: "tasks",
      label: "Tasks",
      count: tasks.length,
      content: tasks.length > 0 ? (
        <div className="space-y-2">
          {tasks.map(task => (
            <div key={task.id} className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{task.title}</span>
              </div>
              <div className="flex items-center gap-2">
                {task.due_date && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                )}
                {task.priority && (
                  <Badge variant="outline" className="text-xs capitalize">{task.priority}</Badge>
                )}
                <StatusBadge status={task.status || "todo"} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-8 text-center">No tasks linked</p>
      ),
    },
  ];

  const sidePanel = (
    <>
      <div className="flex items-center gap-3 pb-2 border-b border-border mb-2">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Handshake className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{deal.title}</p>
          <p className="text-xs text-muted-foreground">{formatCurrency(deal.value)}</p>
        </div>
      </div>

      <InlineEditField
        label="Title"
        value={deal.title}
        type="text"
        onSave={(v) => updateField("title", v)}
      />
      <InlineEditField
        label="Value"
        value={deal.value != null ? String(deal.value) : null}
        type="number"
        onSave={(v) => updateField("value", v)}
      />

      {/* Stage selector */}
      {stageOptions.length > 0 && (
        <InlineEditField
          label="Stage"
          value={deal.stage_id}
          type="select"
          options={stageOptions}
          onSave={(v) => handleStageChange(v)}
        />
      )}

      {/* Visual stage pipeline */}
      {stages.length > 0 && (
        <div className="pt-2 border-t border-border">
          <div className="text-xs text-muted-foreground mb-2">Pipeline</div>
          <div className="flex gap-1">
            {stages.map(s => {
              const isActive = s.id === deal.stage_id;
              const activeIdx = stages.findIndex(st => st.id === deal.stage_id);
              const currentIdx = stages.indexOf(s);
              const isPassed = currentIdx < activeIdx;
              return (
                <button
                  key={s.id}
                  onClick={() => handleStageChange(s.id)}
                  className="flex-1 h-2 rounded-full transition-colors cursor-pointer"
                  style={{
                    backgroundColor: isActive || isPassed ? s.color : undefined,
                  }}
                  title={s.name}
                >
                  {!isActive && !isPassed && (
                    <div className="h-full w-full rounded-full bg-muted" />
                  )}
                </button>
              );
            })}
          </div>
          {stage && (
            <p className="text-xs mt-1" style={{ color: stage.color }}>{stage.name}</p>
          )}
        </div>
      )}

      <InlineEditField
        label="Status"
        value={deal.status}
        type="select"
        options={[
          { value: "open", label: "Open" },
          { value: "won", label: "Won" },
          { value: "lost", label: "Lost" },
        ]}
        onSave={(v) => updateField("status", v)}
      />
      <InlineEditField
        label="Expected Close"
        value={deal.expected_close_date}
        type="date"
        onSave={(v) => updateField("expected_close_date", v)}
      />

      <div className="pt-2 border-t border-border">
        <div className="text-xs text-muted-foreground mb-1">Win Probability</div>
        <div className="text-sm font-semibold">
          {deal.ai_win_probability != null ? `${deal.ai_win_probability}%` : "—"}
        </div>
      </div>

      {deal.contacts && (
        <div className="pt-2 border-t border-border">
          <div className="text-xs text-muted-foreground mb-1">Contact</div>
          <Link href={`/dashboard/contacts/${deal.contacts.id}`} className="text-sm font-medium hover:underline">
            {deal.contacts.first_name} {deal.contacts.last_name || ""}
          </Link>
        </div>
      )}

      {deal.companies && (
        <div className="pt-2 border-t border-border">
          <div className="text-xs text-muted-foreground mb-1">Organization</div>
          <Link href={`/dashboard/companies/${deal.companies.id}`} className="text-sm font-medium hover:underline">
            {deal.companies.name}
          </Link>
        </div>
      )}

      <div className="pt-2 border-t border-border">
        <div className="text-xs text-muted-foreground mb-1">Created</div>
        <div className="text-sm">
          {deal.created_at
            ? new Date(deal.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
            : "—"}
        </div>
      </div>
    </>
  );

  return (
    <PageContainer>
      <DetailLayout
        breadcrumbs={[
          { label: "Deals", href: "/dashboard/deals" },
          { label: deal.title },
        ]}
        title={deal.title}
        subtitle={formatCurrency(deal.value)}
        status={
          <div className="flex items-center gap-2">
            <StatusBadge status={deal.status || "open"} />
            {stage && (
              <span
                className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md"
                style={{ backgroundColor: `${stage.color}15`, color: stage.color }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stage.color }} />
                {stage.name}
              </span>
            )}
          </div>
        }
        actions={
          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="size-3.5 mr-1.5" />
            Delete
          </Button>
        }
        tabs={tabs}
        defaultTab="activity"
        sidePanel={sidePanel}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete deal"
        description={`Are you sure you want to delete "${deal.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDelete}
      />
    </PageContainer>
  );
}
