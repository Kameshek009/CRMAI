"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivityTimeline } from "@/components/crm/activity-timeline";
import { NoteEditor } from "@/components/crm/note-editor";
import { ScoreBadge } from "@/components/crm/score-badge";
import { EntityForm } from "@/components/crm/entity-form";
import { contactFields } from "@/lib/crm/field-definitions";
import { ArrowLeft, Building2, Mail, Phone, Briefcase, Calendar, Pencil } from "lucide-react";
import { toast } from "sonner";

interface ContactDetailContentProps {
  contactId: string;
}

export function ContactDetailContent({ contactId }: ContactDetailContentProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [contact, setContact] = useState<Record<string, any> | null>(null);
  const [activities, setActivities] = useState<{ id: string; type: string; title: string; description?: string | null; created_at: string }[]>([]);
  const [notes, setNotes] = useState<{ id: string; content: string; created_at: string; is_pinned: boolean }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/crm/contacts/${contactId}`).then((r) => r.json()),
      fetch(`/api/crm/activities?contact_id=${contactId}&limit=20`).then((r) => r.json()),
      fetch(`/api/crm/notes?contact_id=${contactId}&limit=20`).then((r) => r.json()),
    ]).then(([contactRes, actRes, notesRes]) => {
      if (contactRes.success) setContact(contactRes.data);
      if (actRes.success) setActivities(actRes.data);
      if (notesRes.success) setNotes(notesRes.data);
      setIsLoading(false);
    });
  }, [contactId]);

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

  if (isLoading) {
    return (
      <PageContainer>
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-64 w-full" />
      </PageContainer>
    );
  }

  if (!contact) {
    return (
      <PageContainer>
        <PageHeader title="Contact not found" />
      </PageContainer>
    );
  }

  const handleEdit = async (values: Record<string, string>) => {
    const res = await fetch(`/api/crm/contacts/${contactId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const json = await res.json();
    if (json.success) {
      setContact(json.data);
      toast.success("Contact updated");
    }
  };

  const name = `${contact.first_name} ${contact.last_name || ""}`.trim();
  const initials = `${String(contact.first_name).charAt(0)}${String(contact.last_name || "").charAt(0)}`.toUpperCase();

  return (
    <PageContainer>
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/contacts">
            <ArrowLeft className="size-4 mr-1" />
            Back to Contacts
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <Avatar className="size-16">
          <AvatarFallback className="text-lg">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{name}</h1>
          {contact.title && <p className="text-muted-foreground">{String(contact.title)}</p>}
          <div className="flex items-center gap-2 mt-2">
            <Badge>{String(contact.status)}</Badge>
            <ScoreBadge score={Number(contact.engagement_score)} label="engagement" />
            <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>
              <Pencil className="size-3.5 mr-1" />
              Edit
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Info */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Contact Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {contact.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="size-4 text-muted-foreground" />
                <a href={`mailto:${contact.email}`} className="hover:underline">{String(contact.email)}</a>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="size-4 text-muted-foreground" />
                <span>{String(contact.phone)}</span>
              </div>
            )}
            {contact.title && (
              <div className="flex items-center gap-2 text-sm">
                <Briefcase className="size-4 text-muted-foreground" />
                <span>{String(contact.title)}</span>
              </div>
            )}
            {contact.companies && typeof contact.companies === "object" && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="size-4 text-muted-foreground" />
                <Link
                  href={`/dashboard/companies/${(contact.companies as Record<string, string>).id}`}
                  className="hover:underline"
                >
                  {(contact.companies as Record<string, string>).name}
                </Link>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="size-4" />
              Added {new Date(String(contact.created_at)).toLocaleDateString()}
            </div>
          </CardContent>
        </Card>

        {/* Activity & Notes */}
        <div className="lg:col-span-2 space-y-6">
          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Notes</CardTitle>
            </CardHeader>
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

          {/* Activity Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityTimeline activities={activities} />
            </CardContent>
          </Card>
        </div>
      </div>

      <EntityForm
        open={showEdit}
        onOpenChange={setShowEdit}
        title="Edit Contact"
        fields={contactFields}
        initialValues={{
          first_name: contact.first_name || "",
          last_name: contact.last_name || "",
          email: contact.email || "",
          phone: contact.phone || "",
          title: contact.title || "",
          status: contact.status || "",
        }}
        onSubmit={handleEdit}
        submitLabel="Save"
      />
    </PageContainer>
  );
}
