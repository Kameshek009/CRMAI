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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import type { Activity } from "@/types/crm";

// ============================================================================
// Types
// ============================================================================

interface Lead {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  organization: string | null;
  website: string | null;
  job_title: string | null;
  source: string | null;
  status: string;
  notes: string | null;
  converted_at: string | null;
  converted_contact_id: string | null;
  converted_deal_id: string | null;
  created_at: string | null;
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

export function LeadDetailContent({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [notes, setNotes] = useState<NoteData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  useEffect(() => {
    const safeFetch = (url: string) =>
      fetch(url).then(r => r.ok ? r.json() : { success: false }).catch(() => ({ success: false }));

    Promise.all([
      safeFetch(`/api/crm/leads/${leadId}`),
      safeFetch(`/api/crm/activities?lead_id=${leadId}&limit=20`),
      safeFetch(`/api/crm/notes?lead_id=${leadId}&limit=20`),
    ]).then(([leadRes, actRes, notesRes]) => {
      if (leadRes.success) setLead(leadRes.data);
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
      setIsLoading(false);
    });
  }, [leadId]);

  const updateField = useCallback(async (field: string, value: string) => {
    const res = await fetch(`/api/crm/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value || null }),
    });
    const json = await res.json();
    if (json.success) {
      setLead(json.data);
      toast.success("Updated");
    } else {
      toast.error("Failed to update");
    }
  }, [leadId]);

  const handleAddNote = async (content: string) => {
    const res = await fetch("/api/crm/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, lead_id: leadId }),
    });
    const json = await res.json();
    if (json.success) {
      setNotes([json.data, ...notes]);
      toast.success("Note added");
    }
  };

  const handleConvert = async () => {
    setIsConverting(true);
    try {
      const res = await fetch(`/api/crm/leads/${leadId}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deal_title: `${lead?.first_name} ${lead?.last_name || ""} - Deal`.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Lead converted to contact");
        if (json.data.contact?.id) {
          router.push(`/dashboard/contacts/${json.data.contact.id}`);
        }
      } else {
        toast.error(json.error || "Failed to convert");
      }
    } finally {
      setIsConverting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/crm/leads/${leadId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Lead deleted");
        router.push("/dashboard/leads");
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

  if (!lead) {
    return <PageContainer><p className="text-muted-foreground">Lead not found</p></PageContainer>;
  }

  const name = `${lead.first_name} ${lead.last_name || ""}`.trim();
  const initials = `${lead.first_name[0] || ""}${(lead.last_name || "")[0] || ""}`.toUpperCase();
  const isConverted = !!lead.converted_at;

  const tabs = [
    {
      value: "activity",
      label: "Activity",
      count: activities.length,
      content: <ActivityStream activities={activities} emptyMessage="No activity yet" />,
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
  ];

  const sidePanel = (
    <>
      <div className="flex items-center gap-3 pb-2 border-b border-border mb-2">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-primary/10 text-sm font-semibold">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{name}</p>
          {lead.email && <p className="text-xs text-muted-foreground truncate">{lead.email}</p>}
        </div>
      </div>

      <InlineEditField label="First Name" value={lead.first_name} type="text" onSave={(v) => updateField("first_name", v)} />
      <InlineEditField label="Last Name" value={lead.last_name} type="text" onSave={(v) => updateField("last_name", v)} />
      <InlineEditField label="Email" value={lead.email} type="email" onSave={(v) => updateField("email", v)} />
      <InlineEditField label="Phone" value={lead.phone} type="tel" onSave={(v) => updateField("phone", v)} />
      <InlineEditField label="Mobile" value={lead.mobile} type="tel" onSave={(v) => updateField("mobile", v)} />
      <InlineEditField label="Organization" value={lead.organization} type="text" onSave={(v) => updateField("organization", v)} />
      <InlineEditField label="Website" value={lead.website} type="url" onSave={(v) => updateField("website", v)} />
      <InlineEditField label="Job Title" value={lead.job_title} type="text" onSave={(v) => updateField("job_title", v)} />
      <InlineEditField
        label="Source"
        value={lead.source}
        type="select"
        options={[
          { value: "website", label: "Website" },
          { value: "referral", label: "Referral" },
          { value: "campaign", label: "Campaign" },
          { value: "cold_call", label: "Cold Call" },
          { value: "social_media", label: "Social Media" },
          { value: "event", label: "Event" },
          { value: "other", label: "Other" },
        ]}
        onSave={(v) => updateField("source", v)}
      />
      <InlineEditField
        label="Status"
        value={lead.status}
        type="select"
        options={[
          { value: "new", label: "New" },
          { value: "contacted", label: "Contacted" },
          { value: "qualified", label: "Qualified" },
          { value: "unqualified", label: "Unqualified" },
          { value: "junk", label: "Junk" },
        ]}
        onSave={(v) => updateField("status", v)}
      />

      {isConverted && lead.converted_contact_id && (
        <div className="pt-2 border-t border-border">
          <div className="text-xs text-muted-foreground mb-1">Converted to</div>
          <Link href={`/dashboard/contacts/${lead.converted_contact_id}`} className="text-sm font-medium hover:underline">
            View Contact
          </Link>
        </div>
      )}

      <div className="pt-2 border-t border-border">
        <div className="text-xs text-muted-foreground mb-1">Created</div>
        <div className="text-sm">
          {lead.created_at
            ? new Date(lead.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
            : "—"}
        </div>
      </div>
    </>
  );

  return (
    <PageContainer>
      <DetailLayout
        breadcrumbs={[
          { label: "Leads", href: "/dashboard/leads" },
          { label: name },
        ]}
        title={name}
        subtitle={lead.job_title || lead.organization || undefined}
        status={<StatusBadge status={lead.status} />}
        actions={
          <div className="flex items-center gap-2">
            {!isConverted && (
              <Button variant="outline" size="sm" onClick={handleConvert} disabled={isConverting}>
                <ArrowRightLeft className="size-3.5 mr-1.5" />
                {isConverting ? "Converting..." : "Convert to Contact"}
              </Button>
            )}
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
        title="Delete lead"
        description={`Are you sure you want to delete ${name}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDelete}
      />
    </PageContainer>
  );
}
