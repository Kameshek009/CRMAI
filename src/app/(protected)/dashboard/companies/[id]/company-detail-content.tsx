"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/dashboard/page-container";
import { DetailLayout } from "@/components/frappe/detail-layout";
import { InlineEditField } from "@/components/frappe/inline-edit-field";
import { ActivityStream } from "@/components/frappe/activity-stream";
import { NoteEditor } from "@/components/crm/note-editor";
import { StatusBadge } from "@/components/frappe/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users, Handshake, Trash2 } from "lucide-react";
import { TimeAgo } from "@/components/ui/time-ago";
import { CopyButton } from "@/components/ui/copy-button";
import { toast } from "sonner";
import { toastWithUndo } from "@/lib/crm/toast-undo";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import { CustomFieldsPanel } from "@/components/crm/custom-fields-panel";
import { PrevNextNav } from "@/components/crm/prev-next-nav";
import type { Activity } from "@/types/crm";

// ============================================================================
// Types
// ============================================================================

interface Company {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  size: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  ai_health_score: number | null;
  contact_count: number;
  deal_count: number;
  created_at: string | null;
  metadata: Record<string, unknown> | null;
}

interface CompanyContact {
  id: string;
  first_name: string;
  last_name: string | null;
  title: string | null;
  email: string | null;
}

interface CompanyDeal {
  id: string;
  title: string;
  value: number | null;
  status: string | null;
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

export function CompanyDetailContent({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [company, setCompany] = useState<Company | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [notes, setNotes] = useState<NoteData[]>([]);
  const [contacts, setContacts] = useState<CompanyContact[]>([]);
  const [deals, setDeals] = useState<CompanyDeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const safeFetch = (url: string) =>
      fetch(url).then(r => r.ok ? r.json() : { success: false }).catch(() => ({ success: false }));

    Promise.all([
      safeFetch(`/api/crm/companies/${companyId}`),
      safeFetch(`/api/crm/activities?company_id=${companyId}&limit=20`),
      safeFetch(`/api/crm/notes?company_id=${companyId}&limit=20`),
      safeFetch(`/api/crm/contacts?company_id=${companyId}&limit=20`),
      safeFetch(`/api/crm/deals?company_id=${companyId}&limit=10`),
    ]).then(([companyRes, actRes, notesRes, contactsRes, dealsRes]) => {
      if (companyRes.success) setCompany(companyRes.data);
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
      if (contactsRes.success) setContacts(contactsRes.data);
      if (dealsRes.success) setDeals(dealsRes.data);
      setIsLoading(false);
    });
  }, [companyId]);

  const updateField = useCallback(async (field: string, value: string) => {
    const res = await fetch(`/api/crm/companies/${companyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value || null }),
    });
    const json = await res.json();
    if (json.success) {
      setCompany(json.data);
      toast.success("Updated");
    } else {
      toast.error("Failed to update");
    }
  }, [companyId]);

  const handleUpdateMetadata = useCallback(async (key: string, value: string) => {
    const currentMeta = company?.metadata || {};
    const newMeta = { ...currentMeta, [key]: value || null };
    const res = await fetch(`/api/crm/companies/${companyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metadata: newMeta }),
    });
    const json = await res.json();
    if (json.success) {
      setCompany(json.data);
      toast.success("Updated");
    } else {
      toast.error("Failed to update");
    }
  }, [companyId, company?.metadata]);

  const handleAddNote = async (content: string) => {
    const res = await fetch("/api/crm/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, company_id: companyId }),
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
      const res = await fetch(`/api/crm/companies/${companyId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toastWithUndo("Organization deleted", "companies", companyId, () => {
          router.push(`/dashboard/companies/${companyId}`);
        });
        router.push("/dashboard/companies");
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

  if (!company) {
    return <PageContainer><p className="text-muted-foreground">Organization not found</p></PageContainer>;
  }

  const initials = company.name.slice(0, 2).toUpperCase();

  const healthScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600";
    if (score >= 60) return "text-blue-600";
    if (score >= 40) return "text-amber-600";
    return "text-red-600";
  };

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
      value: "contacts",
      label: "Contacts",
      count: contacts.length,
      content: contacts.length > 0 ? (
        <div className="space-y-2">
          {contacts.map(c => (
            <Link
              key={c.id}
              href={`/dashboard/contacts/${c.id}`}
              className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-xs bg-primary/10">
                    {(c.first_name[0] || "").toUpperCase()}{(c.last_name?.[0] || "").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <span className="text-sm font-medium">{c.first_name} {c.last_name || ""}</span>
                  {c.title && <p className="text-xs text-muted-foreground">{c.title}</p>}
                </div>
              </div>
              {c.email && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  {c.email}
                  <CopyButton value={c.email} />
                </span>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-8 text-center">No contacts linked</p>
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
  ];

  const sidePanel = (
    <>
      <div className="flex items-center gap-3 pb-2 border-b border-border mb-2">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{company.name}</p>
          {company.domain && (
            <div className="flex items-center gap-1 min-w-0">
              <p className="text-xs text-muted-foreground truncate">{company.domain}</p>
              <CopyButton value={company.domain} />
            </div>
          )}
        </div>
      </div>

      <InlineEditField
        label="Name"
        value={company.name}
        type="text"
        onSave={(v) => updateField("name", v)}
      />
      <InlineEditField
        label="Domain"
        value={company.domain}
        type="url"
        onSave={(v) => updateField("domain", v)}
      />
      <InlineEditField
        label="Industry"
        value={company.industry}
        type="text"
        onSave={(v) => updateField("industry", v)}
      />
      <InlineEditField
        label="Size"
        value={company.size}
        type="select"
        options={[
          { value: "1-10", label: "1-10" },
          { value: "11-50", label: "11-50" },
          { value: "51-200", label: "51-200" },
          { value: "201-500", label: "201-500" },
          { value: "500+", label: "500+" },
        ]}
        onSave={(v) => updateField("size", v)}
      />
      <InlineEditField
        label="Website"
        value={company.website}
        type="url"
        onSave={(v) => updateField("website", v)}
      />
      <InlineEditField
        label="Phone"
        value={company.phone}
        type="tel"
        onSave={(v) => updateField("phone", v)}
      />
      <InlineEditField
        label="Email"
        value={company.email}
        type="email"
        onSave={(v) => updateField("email", v)}
      />

      <CustomFieldsPanel
        entityType="company"
        metadata={company.metadata}
        onUpdateMetadata={handleUpdateMetadata}
      />

      <div className="pt-2 border-t border-border">
        <div className="text-xs text-muted-foreground mb-1">Health Score</div>
        <div className={`text-sm font-semibold ${healthScoreColor(company.ai_health_score || 0)}`}>
          {company.ai_health_score || 0}
        </div>
      </div>

      <div className="pt-2 border-t border-border">
        <div className="flex items-center gap-4">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Contacts</div>
            <div className="text-sm font-semibold">{company.contact_count}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Deals</div>
            <div className="text-sm font-semibold">{company.deal_count}</div>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-border">
        <div className="text-xs text-muted-foreground mb-1">Created</div>
        <div className="text-sm">
          {company.created_at ? <TimeAgo date={company.created_at} /> : "—"}
        </div>
      </div>
    </>
  );

  return (
    <PageContainer>
      <DetailLayout
        breadcrumbs={[
          { label: "Organizations", href: "/dashboard/companies" },
          { label: company.name },
        ]}
        title={company.name}
        subtitle={[company.industry, company.size ? `${company.size} employees` : null].filter(Boolean).join(" · ") || undefined}
        status={
          <span className={`text-xs font-semibold ${healthScoreColor(company.ai_health_score || 0)}`}>
            Health: {company.ai_health_score || 0}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <PrevNextNav entityType="companies" currentId={companyId} />
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
        title="Delete organization"
        description={`Are you sure you want to delete ${company.name}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDelete}
      />
    </PageContainer>
  );
}
