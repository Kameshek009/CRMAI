"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
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
import { cn } from "@/lib/utils";
import { ArrowLeft, Building2, Mail, Phone, Briefcase, Calendar, Pencil, Handshake, CheckSquare, FileText, Globe } from "lucide-react";
import { toast } from "sonner";

interface ContactCompany {
  id: string;
  name: string;
}

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
  companies: ContactCompany | null;
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

interface ContactDetailContentProps {
  contactId: string;
}

const statusConfig: Record<string, { color: string; dot: string }> = {
  lead: { color: "bg-landing-accent/10 text-orange-600 border-landing-accent/20", dot: "bg-landing-accent" },
  active: { color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", dot: "bg-emerald-500" },
  inactive: { color: "bg-gray-500/10 text-gray-500 border-gray-500/20", dot: "bg-gray-400" },
  churned: { color: "bg-red-500/10 text-red-600 border-red-500/20", dot: "bg-red-500" },
};

const avatarGradients: Record<string, string> = {
  lead: "from-landing-accent/20 to-orange-500/20",
  active: "from-emerald-500/20 to-teal-500/20",
  inactive: "from-gray-400/20 to-gray-500/20",
  churned: "from-red-500/20 to-orange-500/20",
};

const priorityConfig: Record<string, string> = {
  urgent: "bg-red-500/10 text-red-600 border-red-200 dark:border-red-800/40",
  high: "bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-800/40",
  medium: "bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800/40",
  low: "bg-gray-500/10 text-gray-600 border-gray-200 dark:border-gray-800",
};

export function ContactDetailContent({ contactId }: ContactDetailContentProps) {
  const [contact, setContact] = useState<Contact | null>(null);
  const [activities, setActivities] = useState<{ id: string; type: string; title: string; description?: string | null; created_at: string }[]>([]);
  const [notes, setNotes] = useState<{ id: string; content: string; created_at: string; is_pinned: boolean }[]>([]);
  const [deals, setDeals] = useState<ContactDeal[]>([]);
  const [tasks, setTasks] = useState<ContactTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    const safeFetch = (url: string) =>
      fetch(url)
        .then((r) => (r.ok ? r.json() : { success: false }))
        .catch(() => ({ success: false }));

    Promise.all([
      safeFetch(`/api/crm/contacts/${contactId}`),
      safeFetch(`/api/crm/activities?contact_id=${contactId}&limit=20`),
      safeFetch(`/api/crm/notes?contact_id=${contactId}&limit=20`),
      safeFetch(`/api/crm/deals?contact_id=${contactId}&limit=10`),
      safeFetch(`/api/crm/tasks?contact_id=${contactId}&limit=10`),
    ]).then(([contactRes, actRes, notesRes, dealsRes, tasksRes]) => {
      if (contactRes.success) setContact(contactRes.data);
      if (actRes.success) setActivities(actRes.data);
      if (notesRes.success) setNotes(notesRes.data);
      if (dealsRes.success) setDeals(dealsRes.data);
      if (tasksRes.success) setTasks(tasksRes.data);
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
        <Skeleton className="h-6 w-32 mb-6 rounded-lg" />
        <div className="flex items-start gap-5 mb-8">
          <Skeleton className="size-20 rounded-2xl" />
          <div className="space-y-3 flex-1">
            <Skeleton className="h-8 w-64 rounded-lg" />
            <Skeleton className="h-4 w-48 rounded-lg" />
            <Skeleton className="h-8 w-80 rounded-lg" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl lg:col-span-2" />
        </div>
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

  const status = String(contact.status || "lead");
  const config = statusConfig[status] || statusConfig.lead;
  const gradient = avatarGradients[status] || avatarGradients.lead;
  const name = `${contact.first_name} ${contact.last_name || ""}`.trim();
  const initials = `${String(contact.first_name).charAt(0)}${String(contact.last_name || "").charAt(0)}`.toUpperCase();

  return (
    <PageContainer>
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <Button variant="ghost" size="sm" className="hover:bg-muted/80 -ml-2" asChild>
          <Link href="/dashboard/contacts">
            <ArrowLeft className="size-4 mr-1.5" />
            Contacts
          </Link>
        </Button>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex items-start gap-5 mb-8"
      >
        <div className="relative">
          <Avatar className="size-20 ring-4 ring-background shadow-lg">
            <AvatarFallback className={cn("text-2xl font-bold bg-gradient-to-br", gradient)}>
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className={cn("absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-3 border-background", config.dot)} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{name}</h1>
          {contact.title && <p className="text-muted-foreground mt-0.5">{String(contact.title)}</p>}
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <Badge variant="outline" className={cn("text-xs border badge-shimmer", config.color)}>
              {status}
            </Badge>
            <ScoreBadge score={Number(contact.engagement_score)} size="md" />
            {contact.source && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                <Globe className="size-3 mr-1" />
                {String(contact.source)}
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={() => setShowEdit(true)} className="ml-auto shadow-sm">
              <Pencil className="size-3.5 mr-1.5" />
              Edit
            </Button>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="glass-card lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-gradient-to-br from-landing-accent to-landing-accent flex items-center justify-center">
                  <Mail className="w-3 h-3 text-landing-accent-foreground" />
                </div>
                Contact Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {contact.email && (
                <div className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-landing-accent/10 flex items-center justify-center shrink-0">
                    <Mail className="size-4 text-landing-accent" />
                  </div>
                  <a href={`mailto:${contact.email}`} className="hover:underline text-foreground truncate">{String(contact.email)}</a>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Phone className="size-4 text-emerald-500" />
                  </div>
                  <span>{String(contact.phone)}</span>
                </div>
              )}
              {contact.title && (
                <div className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-landing-accent/10 flex items-center justify-center shrink-0">
                    <Briefcase className="size-4 text-landing-accent" />
                  </div>
                  <span>{String(contact.title)}</span>
                </div>
              )}
              {contact.companies && (
                <div className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                    <Building2 className="size-4 text-amber-500" />
                  </div>
                  <Link
                    href={`/dashboard/companies/${contact.companies.id}`}
                    className="hover:underline font-medium"
                  >
                    {contact.companies.name}
                  </Link>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm p-2 rounded-lg text-muted-foreground">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Calendar className="size-4" />
                </div>
                Added {new Date(String(contact.created_at)).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Activity & Notes */}
        <div className="lg:col-span-2 space-y-6">
          {/* Notes */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
          >
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-gradient-to-br from-landing-accent to-orange-500 flex items-center justify-center">
                    <FileText className="w-3 h-3 text-landing-accent-foreground" />
                  </div>
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <NoteEditor onSubmit={handleAddNote} />
                {notes.map((note, i) => (
                  <motion.div
                    key={note.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.05 * i }}
                    className="border-l-3 border-amber-500/30 pl-4 py-2 rounded-r-lg hover:bg-muted/30 transition-colors"
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{note.content}</p>
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                      {new Date(note.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Related Deals */}
          {deals.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <Card className="glass-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-gradient-to-br from-landing-accent to-orange-500 flex items-center justify-center">
                      <Handshake className="w-3 h-3 text-landing-accent-foreground" />
                    </div>
                    Deals
                    <Badge variant="secondary" className="text-[10px] ml-1">{deals.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {deals.map((deal) => (
                      <Link
                        key={String(deal.id)}
                        href={`/dashboard/deals/${deal.id}`}
                        className="flex items-center justify-between rounded-xl border p-3.5 premium-card bg-card"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{String(deal.title)}</p>
                          <Badge variant="outline" className="text-[10px] mt-1 capitalize">{String(deal.status)}</Badge>
                        </div>
                        <span className="text-sm font-bold tabular-nums">${Number(deal.value).toLocaleString()}</span>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Related Tasks */}
          {tasks.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.35 }}
            >
              <Card className="glass-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-gradient-to-br from-landing-accent to-orange-500 flex items-center justify-center">
                      <CheckSquare className="w-3 h-3 text-landing-accent-foreground" />
                    </div>
                    Tasks
                    <Badge variant="secondary" className="text-[10px] ml-1">{tasks.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {tasks.map((task) => {
                      const isOverdue = task.due_date && new Date(String(task.due_date)) < new Date() && task.status !== "done";
                      return (
                        <div
                          key={String(task.id)}
                          className={cn(
                            "flex items-center justify-between rounded-xl border p-3.5 bg-card",
                            isOverdue && "border-red-200/60 bg-red-50/20 dark:border-red-900/20 dark:bg-red-950/10"
                          )}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{String(task.title)}</p>
                            {task.due_date && (
                              <p className={cn("text-[11px] mt-0.5", isOverdue ? "text-red-600 font-semibold" : "text-muted-foreground")}>
                                Due: {new Date(String(task.due_date)).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                {isOverdue && " (overdue)"}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {task.priority && (
                              <Badge variant="outline" className={cn("text-[10px]", priorityConfig[task.priority] || "")}>
                                {task.priority}
                              </Badge>
                            )}
                            <Badge variant={task.status === "done" ? "default" : "secondary"} className="text-[10px]">
                              {String(task.status)}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Activity Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-gradient-to-br from-landing-accent to-landing-accent flex items-center justify-center">
                    <Calendar className="w-3 h-3 text-landing-accent-foreground" />
                  </div>
                  Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ActivityTimeline activities={activities} />
              </CardContent>
            </Card>
          </motion.div>
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
