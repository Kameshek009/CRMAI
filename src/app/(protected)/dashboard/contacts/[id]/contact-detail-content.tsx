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
      toast.success("Updated");
    } else {
      toast.error("Failed to update");
    }
  }, [contactId]);

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
      toast.success("Updated");
    } else {
      toast.error("Failed to update");
    }
  }, [contactId, contact?.metadata]);

  const handleAddNote = async (content: string) => {
    const res = await fetch("/api/crm/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, contact_id: contactId }),
    });
    const json = await res.json();
    if (json.success) {
      setNotes([json.data, ...notes]);
      toast.success("Note added");
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
          toast.success(`Enriched ${applied} field${applied !== 1 ? "s" : ""}`);
        } else {
          toast.info(enrichment.notes || "No new data to apply");
        }
      } else {
        toast.error(json.error || "Enrichment failed");
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
        toastWithUndo("Contact deleted", "contacts", contactId, () => {
          router.push(`/dashboard/contacts/${contactId}`);
        });
        router.push("/dashboard/contacts");
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

  if (!contact) {
    return <PageContainer><p className="text-muted-foreground">Contact not found</p></PageContainer>;
  }

  const name = `${contact.first_name} ${contact.last_name || ""}`.trim();
  const initials = `${contact.first_name[0] || ""}${(contact.last_name || "")[0] || ""}`.toUpperCase();

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
              <TimeAgo date={note.created_at} className="text-xs text-muted-foreground mt-1" />
            </div>
          ))}
          {notes.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">No notes yet</p>}
        </div>
      ),
    },
    {
      value: "deals",
      label: "Deals",
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
        <p className="text-sm text-muted-foreground py-8 text-center">No deals linked</p>
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
    {
      value: "emails",
      label: "Emails",
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
        label="First Name"
        value={contact.first_name}
        type="text"
        onSave={(v) => updateField("first_name", v)}
      />
      <InlineEditField
        label="Last Name"
        value={contact.last_name}
        type="text"
        onSave={(v) => updateField("last_name", v)}
      />
      <InlineEditField
        label="Email"
        value={contact.email}
        type="email"
        onSave={(v) => updateField("email", v)}
      />
      <InlineEditField
        label="Phone"
        value={contact.phone}
        type="tel"
        onSave={(v) => updateField("phone", v)}
      />
      <InlineEditField
        label="Job Title"
        value={contact.title}
        type="text"
        onSave={(v) => updateField("title", v)}
      />
      <InlineEditField
        label="Status"
        value={contact.status}
        type="select"
        options={[
          { value: "lead", label: "Lead" },
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
          { value: "churned", label: "Churned" },
        ]}
        onSave={(v) => updateField("status", v)}
      />
      <InlineEditField
        label="Source"
        value={contact.source}
        type="text"
        onSave={(v) => updateField("source", v)}
      />

      <div className="pt-2 border-t border-border">
        <div className="text-xs text-muted-foreground mb-1">Engagement Score</div>
        <div className="text-sm font-semibold">{contact.engagement_score || 0}</div>
      </div>

      <CustomFieldsPanel
        entityType="contact"
        metadata={contact.metadata}
        onUpdateMetadata={handleUpdateMetadata}
      />

      {contact.companies && (
        <div className="pt-2 border-t border-border">
          <div className="text-xs text-muted-foreground mb-1">Organization</div>
          <Link href={`/dashboard/companies/${contact.companies.id}`} className="text-sm font-medium hover:underline">
            {contact.companies.name}
          </Link>
        </div>
      )}

      <div className="pt-2 border-t border-border">
        <div className="text-xs text-muted-foreground mb-1">Created</div>
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
          { label: "Contacts", href: "/dashboard/contacts" },
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
              Enrich
            </Button>
            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="size-3.5 mr-1.5" />
              Delete
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
        title="Delete contact"
        description={`Are you sure you want to delete ${name}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDelete}
      />
    </PageContainer>
  );
}
