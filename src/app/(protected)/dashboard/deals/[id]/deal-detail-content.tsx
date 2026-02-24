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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Handshake, CheckSquare, Trash2, Plus, Loader2, Send, CalendarDays } from "lucide-react";
import { TimeAgo } from "@/components/ui/time-ago";
import { toast } from "sonner";
import { toastWithUndo } from "@/lib/crm/toast-undo";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import { CustomFieldsPanel } from "@/components/crm/custom-fields-panel";
import { EmailList } from "@/components/frappe/email-list";
import { PrevNextNav } from "@/components/crm/prev-next-nav";
import { ChangeHistory } from "@/components/crm/change-history";
import { AttachmentGallery } from "@/components/crm/attachment-gallery";
import { useTranslation } from "@/lib/i18n";
import { format } from "date-fns";
import type { Attachment } from "@/lib/supabase/storage";
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
  metadata: Record<string, unknown> | null;
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

interface DealShowing {
  id: string;
  title: string;
  address: string;
  showing_date: string;
  status: string;
}

// ============================================================================
// Component
// ============================================================================

export function DealDetailContent({ dealId }: { dealId: string }) {
  const router = useRouter();
  const { t } = useTranslation();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [notes, setNotes] = useState<NoteData[]>([]);
  const [tasks, setTasks] = useState<DealTask[]>([]);
  const [stages, setStages] = useState<DealStage[]>([]);
  const [showings, setShowings] = useState<DealShowing[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Quick task form
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  // Activity log form
  const [activityType, setActivityType] = useState("call");
  const [activityTitle, setActivityTitle] = useState("");
  const [activityDesc, setActivityDesc] = useState("");
  const [isLoggingActivity, setIsLoggingActivity] = useState(false);

  useEffect(() => {
    const safeFetch = (url: string) =>
      fetch(url).then(r => r.ok ? r.json() : { success: false }).catch(() => ({ success: false }));

    Promise.all([
      safeFetch(`/api/crm/deals/${dealId}`),
      safeFetch(`/api/crm/activities?deal_id=${dealId}&limit=20`),
      safeFetch(`/api/crm/notes?deal_id=${dealId}&limit=20`),
      safeFetch(`/api/crm/tasks?deal_id=${dealId}&limit=10`),
      safeFetch(`/api/crm/pipeline`),
      safeFetch(`/api/crm/showings?filter_deal_id=${dealId}&limit=20&sort_by=showing_date&sort_order=desc`),
    ]).then(([dealRes, actRes, notesRes, tasksRes, stagesRes, showingsRes]) => {
      if (dealRes.success) {
        setDeal(dealRes.data);
        setAttachments((dealRes.data?.metadata?.attachments as Attachment[]) || []);
      }
      if (actRes.success) {
        setActivities(actRes.data.map((a: Record<string, unknown>) => ({
          id: a.id as string,
          accountId: a.account_id as string,
          contactId: (a.contact_id as string) || null,
          dealId: (a.deal_id as string) || null,
          companyId: (a.company_id as string) || null,
          type: a.type as string,
          title: a.title as string,
          description: (a.description as string) || null,
          metadata: (a.metadata as Record<string, unknown>) || {},
          createdAt: a.created_at as string,
        })));
      }
      if (notesRes.success) setNotes(notesRes.data);
      if (tasksRes.success) setTasks(tasksRes.data);
      if (stagesRes.success && stagesRes.data?.columns) {
        const parsed = stagesRes.data.columns.map((c: { stage: DealStage }) => c.stage);
        setStages(parsed.sort((a: DealStage, b: DealStage) => a.position - b.position));
      }
      if (showingsRes.success) setShowings(showingsRes.data);
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
      toast.success(t("crm.deals.detail.updated"));
    } else {
      toast.error(t("crm.deals.detail.failedUpdate"));
    }
  }, [dealId, t]);

  const handleUpdateMetadata = useCallback(async (key: string, value: string) => {
    const currentMeta = deal?.metadata || {};
    const newMeta = { ...currentMeta, [key]: value || null };
    const res = await fetch(`/api/crm/deals/${dealId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metadata: newMeta }),
    });
    const json = await res.json();
    if (json.success) {
      setDeal(json.data);
      toast.success(t("crm.deals.detail.updated"));
    } else {
      toast.error(t("crm.deals.detail.failedUpdate"));
    }
  }, [dealId, deal?.metadata, t]);

  const handleStageChange = async (stageId: string) => {
    const res = await fetch(`/api/crm/deals/${dealId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage_id: stageId }),
    });
    const json = await res.json();
    if (json.success) {
      setDeal(json.data);
      toast.success(t("crm.deals.detail.stageUpdated"));
    } else {
      toast.error(t("crm.deals.detail.failedStage"));
    }
  };

  const handleAddNote = async (content: string) => {
    try {
      const res = await fetch("/api/crm/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, deal_id: dealId }),
      });
      const json = await res.json();
      if (json.success) {
        setNotes([json.data, ...notes]);
        toast.success(t("crm.deals.detail.noteAdded"));
      } else {
        toast.error(json.error || t("common.failed"));
      }
    } catch {
      toast.error(t("common.failed"));
    }
  };

  const handleAddTask = async () => {
    const trimmed = newTaskTitle.trim();
    if (!trimmed) return;
    setIsCreatingTask(true);
    try {
      const res = await fetch("/api/crm/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed, deal_id: dealId }),
      });
      const json = await res.json();
      if (json.success) {
        setTasks([json.data, ...tasks]);
        setNewTaskTitle("");
        toast.success(t("crm.deals.detail.taskCreated"));
      } else {
        toast.error(t("crm.deals.detail.failedTask"));
      }
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleLogActivity = async () => {
    const trimmedTitle = activityTitle.trim();
    if (!trimmedTitle) return;
    setIsLoggingActivity(true);
    try {
      const res = await fetch("/api/crm/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: activityType,
          title: trimmedTitle,
          description: activityDesc.trim() || undefined,
          deal_id: dealId,
          contact_id: deal?.contacts?.id || undefined,
          company_id: deal?.companies?.id || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setActivities([{
          id: json.data.id,
          accountId: json.data.account_id || "",
          contactId: json.data.contact_id || null,
          dealId: json.data.deal_id || null,
          companyId: json.data.company_id || null,
          type: json.data.type,
          title: json.data.title,
          description: json.data.description || null,
          metadata: json.data.metadata || {},
          createdAt: json.data.created_at,
        }, ...activities]);
        setActivityTitle("");
        setActivityDesc("");
        toast.success(t("crm.deals.detail.activityLogged"));
      } else {
        toast.error(t("crm.deals.detail.failedActivity"));
      }
    } finally {
      setIsLoggingActivity(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/crm/deals/${dealId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toastWithUndo(t("crm.deals.detail.dealDeleted"), "deals", dealId, () => {
          router.push(`/dashboard/deals/${dealId}`);
        }, { undo: t("common.undo"), restored: t("common.restored"), failedRestore: t("common.failedRestore") });
        router.push("/dashboard/deals");
      } else {
        toast.error(t("crm.deals.detail.failedDelete"));
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
    return <PageContainer><p className="text-muted-foreground">{t("crm.deals.detail.notFound")}</p></PageContainer>;
  }

  const formatCurrency = (value: number | null) => {
    if (value == null) return "—";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
  };

  const stage = deal.deal_stages;
  const stageOptions = stages.map(s => ({ value: s.id, label: s.name }));

  const activityTypeOptions = [
    { value: "call", label: t("crm.deals.detail.activityTypes.call") },
    { value: "email", label: t("crm.deals.detail.activityTypes.email") },
    { value: "meeting", label: t("crm.deals.detail.activityTypes.meeting") },
    { value: "note", label: t("crm.deals.detail.activityTypes.note") },
  ];

  const tabs = [
    {
      value: "activity",
      label: t("crm.deals.detail.tabs.activity"),
      count: activities.length,
      content: (
        <div className="space-y-4">
          {/* Log activity form */}
          <div className="rounded-lg border p-3 space-y-3">
            <div className="flex gap-2">
              <Select value={activityType} onValueChange={setActivityType}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {activityTypeOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={activityTitle}
                onChange={(e) => setActivityTitle(e.target.value)}
                placeholder={t("crm.deals.detail.activityTitlePlaceholder")}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleLogActivity();
                  }
                }}
              />
            </div>
            <Textarea
              value={activityDesc}
              onChange={(e) => setActivityDesc(e.target.value)}
              placeholder={t("crm.deals.detail.activityDescPlaceholder")}
              rows={2}
              className="resize-none"
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleLogActivity}
                disabled={!activityTitle.trim() || isLoggingActivity}
              >
                {isLoggingActivity ? <Loader2 className="size-4 mr-1 animate-spin" /> : <Send className="size-4 mr-1" />}
                {t("crm.deals.detail.logActivity")}
              </Button>
            </div>
          </div>

          <ActivityStream
            activities={activities}
            emptyMessage={t("crm.deals.detail.noActivity")}
          />
        </div>
      ),
    },
    {
      value: "notes",
      label: t("crm.deals.detail.tabs.notes"),
      count: notes.length,
      content: (
        <div className="space-y-4">
          <NoteEditor onSubmit={handleAddNote} />
          {notes.map(note => (
            <div key={note.id} className="border-l-2 border-muted-foreground/20 pl-4 py-2">
              <p className="text-sm whitespace-pre-wrap">{note.content}</p>
              <TimeAgo date={note.created_at} className="text-xs text-muted-foreground mt-1" />
            </div>
          ))}
          {notes.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">{t("crm.deals.detail.noNotes")}</p>}
        </div>
      ),
    },
    {
      value: "tasks",
      label: t("crm.deals.detail.tabs.tasks"),
      count: tasks.length,
      content: (
        <div className="space-y-4">
          {/* Quick task creation form */}
          <div className="flex gap-2">
            <Input
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder={t("crm.deals.detail.taskPlaceholder")}
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddTask();
                }
              }}
            />
            <Button
              size="sm"
              onClick={handleAddTask}
              disabled={!newTaskTitle.trim() || isCreatingTask}
            >
              {isCreatingTask ? <Loader2 className="size-4 mr-1 animate-spin" /> : <Plus className="size-4 mr-1" />}
              {t("crm.deals.detail.addTask")}
            </Button>
          </div>

          {tasks.length > 0 ? (
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
                        {new Date(task.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
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
            <p className="text-sm text-muted-foreground py-8 text-center">{t("crm.deals.detail.noTasks")}</p>
          )}
        </div>
      ),
    },
    {
      value: "emails",
      label: t("crm.deals.detail.tabs.emails"),
      content: <EmailList entityType="deal" entityId={dealId} />,
    },
    {
      value: "showings",
      label: t("crm.deals.detail.tabs.showings"),
      count: showings.length,
      content: showings.length > 0 ? (
        <div className="space-y-2">
          {showings.map(s => (
            <Link
              key={s.id}
              href="/dashboard/showings"
              className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="text-sm font-medium">{s.title}</span>
                  <span className="text-xs text-muted-foreground ml-2">{s.address}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(s.showing_date), "dd.MM.yyyy HH:mm")}
                </span>
                <StatusBadge status={s.status} label={t(`crm.showings.statuses.${s.status}`)} />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-8 text-center">{t("crm.deals.detail.noShowings")}</p>
      ),
    },
    {
      value: "attachments",
      label: t("crm.attachments.title"),
      count: attachments.length,
      content: (
        <AttachmentGallery
          entityType="deals"
          entityId={dealId}
          attachments={attachments}
          onAttachmentsChange={setAttachments}
        />
      ),
    },
    {
      value: "history",
      label: t("crm.history.title"),
      content: <ChangeHistory entityType="deal" entityId={dealId} />,
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
        label={t("crm.deals.fields.title")}
        value={deal.title}
        type="text"
        onSave={(v) => updateField("title", v)}
      />
      <InlineEditField
        label={t("crm.deals.fields.value")}
        value={deal.value != null ? String(deal.value) : null}
        type="number"
        onSave={(v) => updateField("value", v)}
      />

      {/* Stage selector */}
      {stageOptions.length > 0 && (
        <InlineEditField
          label={t("crm.deals.fields.stage")}
          value={deal.stage_id}
          type="select"
          options={stageOptions}
          onSave={(v) => handleStageChange(v)}
        />
      )}

      {/* Visual stage pipeline */}
      {stages.length > 0 && (
        <div className="pt-2 border-t border-border">
          <div className="text-xs text-muted-foreground mb-2">{t("crm.deals.detail.pipeline")}</div>
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
        label={t("crm.deals.fields.status")}
        value={deal.status}
        type="select"
        options={[
          { value: "open", label: t("crm.deals.statuses.open") },
          { value: "won", label: t("crm.deals.statuses.won") },
          { value: "lost", label: t("crm.deals.statuses.lost") },
        ]}
        onSave={(v) => updateField("status", v)}
      />
      <InlineEditField
        label={t("crm.deals.fields.expectedClose")}
        value={deal.expected_close_date}
        type="date"
        onSave={(v) => updateField("expected_close_date", v)}
      />

      <CustomFieldsPanel
        entityType="deal"
        metadata={deal.metadata}
        onUpdateMetadata={handleUpdateMetadata}
      />

      <div className="pt-2 border-t border-border">
        <div className="text-xs text-muted-foreground mb-1">{t("crm.deals.detail.winProbability")}</div>
        <div className="text-sm font-semibold">
          {deal.ai_win_probability != null ? `${deal.ai_win_probability}%` : "—"}
        </div>
      </div>

      {deal.contacts && (
        <div className="pt-2 border-t border-border">
          <div className="text-xs text-muted-foreground mb-1">{t("crm.deals.fields.contact")}</div>
          <Link href={`/dashboard/contacts/${deal.contacts.id}`} className="text-sm font-medium hover:underline">
            {deal.contacts.first_name} {deal.contacts.last_name || ""}
          </Link>
        </div>
      )}

      {deal.companies && (
        <div className="pt-2 border-t border-border">
          <div className="text-xs text-muted-foreground mb-1">{t("crm.deals.fields.organization")}</div>
          <Link href={`/dashboard/companies/${deal.companies.id}`} className="text-sm font-medium hover:underline">
            {deal.companies.name}
          </Link>
        </div>
      )}

      <div className="pt-2 border-t border-border">
        <div className="text-xs text-muted-foreground mb-1">{t("crm.deals.detail.created")}</div>
        <div className="text-sm">
          {deal.created_at ? <TimeAgo date={deal.created_at} /> : "—"}
        </div>
      </div>
    </>
  );

  return (
    <PageContainer>
      <DetailLayout
        breadcrumbs={[
          { label: t("crm.deals.detail.breadcrumb"), href: "/dashboard/deals" },
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
          <div className="flex items-center gap-2">
            <PrevNextNav entityType="deals" currentId={dealId} />
            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="size-3.5 mr-1.5" />
              {t("crm.deals.detail.delete")}
            </Button>
          </div>
        }
        tabs={tabs}
        defaultTab="activity"
        sidePanel={sidePanel}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t("crm.deals.detail.deleteDealTitle")}
        description={t("crm.deals.detail.deleteDealConfirm", { title: deal.title })}
        confirmLabel={t("crm.deals.detail.delete")}
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDelete}
      />
    </PageContainer>
  );
}
