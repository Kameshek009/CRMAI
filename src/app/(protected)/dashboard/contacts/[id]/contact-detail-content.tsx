"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/dashboard/page-container";
import { DetailLayout } from "@/components/frappe/detail-layout";
import { InlineEditField } from "@/components/frappe/inline-edit-field";
import { ActivityStream } from "@/components/frappe/activity-stream";
import { StatusBadge } from "@/components/frappe/status-badge";
import { NoteEditor } from "@/components/crm/note-editor";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Handshake, CheckSquare, Trash2, Sparkles, Loader2 } from "lucide-react";
import { TimeAgo } from "@/components/ui/time-ago";
import { CopyButton } from "@/components/ui/copy-button";
import { toast } from "sonner";
import { toastWithUndo } from "@/lib/crm/toast-undo";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import { CustomFieldsPanel } from "@/components/crm/custom-fields-panel";
import { EmailList } from "@/components/frappe/email-list";
import { PrevNextNav } from "@/components/crm/prev-next-nav";
import { useTranslation } from "@/lib/i18n";
import type { Activity } from "@/types/crm";

// ============================================================================
// Types
// ============================================================================

interface Contact {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  title: string | null;
  status: string | null;
  engagement_score: number | null;
  source: string | null;
  created_at: string | null;
  metadata: Record<string, unknown> | null;
  companies: { id: string; name: string } | null;
}

interface ContactDeal {
  id: string;
  title: string;
  value: number | null;
  status: string | null;
}

interface ContactTask {
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

export function ContactDetailContent({ contactId }: { contactId: string }) {
  const router = useRouter();
  const { t } = useTranslation();
  const [contact, setContact] = useState<Contact | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [notes, setNotes] = useState<NoteData[]>([]);
  const [deals, setDeals] = useState<ContactDeal[]>([]);
  const [tasks, setTasks] = useState<ContactTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);

  useEffect(() => {
    const safeFetch = (url: string) =>
      fetch(url).then(r => r.ok ? r.json() : { success: false }).catch(() => ({ success: false }));

    Promise.all([
      safeFetch(`/api/crm/contacts/${contactId}`),
      safeFetch(`/api/crm/activities?contact_id=${contactId}&limit=20`),
      safeFetch(`/api/crm/notes?contact_id=${contactId}&limit=20`),
      safeFetch(`/api/crm/deals?contact_id=${contactId}&limit=10`),
      safeFetch(`/api/crm/tasks?contact_id=${contactId}&limit=10`),
    ]).then(([contactRes, actRes, notesRes, dealsRes, tasksRes]) => {
      if (contactRes.success) setContact(contactRes.data);
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
      if (dealsRes.success) setDeals(dealsRes.data);
      if (tasksRes.success) setTasks(tasksRes.data);
      setIsLoading(false);
    });
  }, [contactId]);

  const updateField = useCallback(async (field: string, value: string) => {
    const res = await fetch(`/api/crm/contacts/${contactId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value || null }),
    });
    const json = await res.json();
    if (json.success) {
      setContact(json.data);
      toast.success(t("common.updated"));
    } else {
      toast.error(t("common.failedUpdate"));
    }
  }, [contactId, t]);

  const handleUpdateMetadata = useCallback(async (key: string, value: string) => {
    const currentMeta = contact?.metadata || {};
    const newMeta = { ...currentMeta, [key]: value || null };
    const res = await fetch(`/api/crm/contacts/${contactId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metadata: newMeta }),
    });
    const json = await res.json();
    if (json.success) {
      setContact(json.data);
      toast.success(t("common.updated"));
    } else {
      toast.error(t("common.failedUpdate"));
    }
  }, [contactId, contact?.metadata, t]);

  const handleAddNote = async (content: string) => {
    const res = await fetch("/api/crm/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, contact_id: contactId }),
    });
    const json = await res.json();
    if (json.success) {
      setNotes([json.data, ...notes]);
      toast.success(t("common.noteAdded"));
    }
  };

  const handleEnrich = async () => {
    setIsEnriching(true);
    try {
      const res = await fetch("/api/crm/ai/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_id: contactId }),
      });
      const json = await res.json();
      if (json.success) {
        const { enrichment, applied, contact: updatedContact } = json.data;
        if (applied > 0) {
          setContact(updatedContact);
          toast.success(t("crm.contacts.detail.enriched", { count: applied }));
        } else {
          toast.info(enrichment.notes || t("crm.contacts.detail.noEnrichData"));
        }
      } else {
        toast.error(json.error || t("crm.contacts.detail.enrichFailed"));
      }
    } finally {
      setIsEnriching(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/crm/contacts/${contactId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toastWithUndo(t("crm.contacts.detail.deleted"), "contacts", contactId, () => {
          router.push(`/dashboard/contacts/${contactId}`);
        }, { undo: t("common.undo"), restored: t("common.restored"), failedRestore: t("common.failedRestore") });
        router.push("/dashboard/contacts");
      } else {
        toast.error(t("common.failedDelete"));
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

  if (!contact) {
    return <PageContainer><p className="text-muted-foreground">{t("crm.contacts.detail.notFound")}</p></PageContainer>;
  }

  const name = `${contact.first_name} ${contact.last_name || ""}`.trim();
  const initials = `${contact.first_name[0] || ""}${(contact.last_name || "")[0] || ""}`.toUpperCase();

  const tabs = [
    {
      value: "activity",
      label: t("crm.contacts.detail.activity"),
      count: activities.length,
      content: (
        <ActivityStream
          activities={activities}
          emptyMessage={t("crm.contacts.detail.noActivity")}
        />
      ),
    },
    {
      value: "notes",
      label: t("crm.contacts.detail.notes"),
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
          {notes.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">{t("crm.contacts.detail.noNotes")}</p>}
        </div>
      ),
    },
    {
      value: "deals",
      label: t("crm.contacts.detail.deals"),
      count: deals.length,
      content: deals.length > 0 ? (
        <div className="space-y-2">
          {deals.map(deal => (
            <Link
              key={deal.id}
              href={`/dashboard/deals/${deal.id}`}
              className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Handshake className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{deal.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">${(deal.value || 0).toLocaleString()}</span>
                <StatusBadge status={deal.status || "open"} />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-8 text-center">{t("crm.contacts.detail.noDeals")}</p>
      ),
    },
    {
      value: "tasks",
      label: t("crm.contacts.detail.tasks"),
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
                {task.priority && (
                  <Badge variant="outline" className="text-xs capitalize">{task.priority}</Badge>
                )}
                <StatusBadge status={task.status || "todo"} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-8 text-center">{t("crm.contacts.detail.noTasks")}</p>
      ),
    },
    {
      value: "emails",
      label: t("crm.contacts.detail.emails"),
      content: <EmailList entityType="contact" entityId={contactId} />,
    },
  ];

  const sidePanel = (
    <>
      <div className="flex items-center gap-3 pb-2 border-b border-border mb-2">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-primary/10 text-sm font-semibold">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{name}</p>
          {contact.email && (
            <div className="flex items-center gap-1 min-w-0">
              <p className="text-xs text-muted-foreground truncate">{contact.email}</p>
              <CopyButton value={contact.email} />
            </div>
          )}
        </div>
      </div>

      <InlineEditField
        label={t("crm.contacts.fields.firstName")}
        value={contact.first_name}
        type="text"
        onSave={(v) => updateField("first_name", v)}
      />
      <InlineEditField
        label={t("crm.contacts.fields.lastName")}
        value={contact.last_name}
        type="text"
        onSave={(v) => updateField("last_name", v)}
      />
      <InlineEditField
        label={t("crm.contacts.fields.email")}
        value={contact.email}
        type="email"
        onSave={(v) => updateField("email", v)}
      />
      <InlineEditField
        label={t("crm.contacts.fields.phone")}
        value={contact.phone}
        type="tel"
        onSave={(v) => updateField("phone", v)}
      />
      <InlineEditField
        label={t("crm.contacts.fields.jobTitle")}
        value={contact.title}
        type="text"
        onSave={(v) => updateField("title", v)}
      />
      <InlineEditField
        label={t("crm.contacts.fields.status")}
        value={contact.status}
        type="select"
        options={[
          { value: "lead", label: t("crm.contacts.statuses.lead") },
          { value: "active", label: t("crm.contacts.statuses.active") },
          { value: "inactive", label: t("crm.contacts.statuses.inactive") },
          { value: "churned", label: t("crm.contacts.statuses.churned") },
        ]}
        onSave={(v) => updateField("status", v)}
      />
      <InlineEditField
        label={t("crm.contacts.detail.source")}
        value={contact.source}
        type="text"
        onSave={(v) => updateField("source", v)}
      />

      <div className="pt-2 border-t border-border">
        <div className="text-xs text-muted-foreground mb-1">{t("crm.contacts.detail.engagementScore")}</div>
        <div className="text-sm font-semibold">{contact.engagement_score || 0}</div>
      </div>

      <CustomFieldsPanel
        entityType="contact"
        metadata={contact.metadata}
        onUpdateMetadata={handleUpdateMetadata}
      />

      {contact.companies && (
        <div className="pt-2 border-t border-border">
          <div className="text-xs text-muted-foreground mb-1">{t("crm.contacts.detail.organization")}</div>
          <Link href={`/dashboard/companies/${contact.companies.id}`} className="text-sm font-medium hover:underline">
            {contact.companies.name}
          </Link>
        </div>
      )}

      <div className="pt-2 border-t border-border">
        <div className="text-xs text-muted-foreground mb-1">{t("crm.contacts.detail.created")}</div>
        <div className="text-sm">
          {contact.created_at ? <TimeAgo date={contact.created_at} /> : "—"}
        </div>
      </div>
    </>
  );

  return (
    <PageContainer>
      <DetailLayout
        breadcrumbs={[
          { label: t("crm.contacts.detail.breadcrumb"), href: "/dashboard/contacts" },
          { label: name },
        ]}
        title={name}
        subtitle={contact.title}
        status={<StatusBadge status={contact.status || "lead"} />}
        actions={
          <div className="flex items-center gap-2">
            <PrevNextNav entityType="contacts" currentId={contactId} />
            <Button variant="outline" size="sm" onClick={handleEnrich} disabled={isEnriching}>
              {isEnriching ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Sparkles className="size-3.5 mr-1.5" />}
              {t("crm.contacts.detail.enrich")}
            </Button>
            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="size-3.5 mr-1.5" />
              {t("crm.contacts.detail.delete")}
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
        title={t("crm.contacts.detail.deleteTitle")}
        description={t("crm.contacts.detail.deleteConfirm", { name })}
        confirmLabel={t("crm.contacts.detail.delete")}
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDelete}
      />
    </PageContainer>
  );
}
