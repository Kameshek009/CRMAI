"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/dashboard/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScoreBadge } from "@/components/crm/score-badge";
import { ActivityTimeline } from "@/components/crm/activity-timeline";
import { EntityForm } from "@/components/crm/entity-form";
import { companyFields } from "@/lib/crm/field-definitions";
import { ArrowLeft, Globe, Phone, Mail, Users, Handshake, Pencil } from "lucide-react";
import { toast } from "sonner";

interface CompanyDetailContentProps {
  companyId: string;
}

export function CompanyDetailContent({ companyId }: CompanyDetailContentProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [company, setCompany] = useState<Record<string, any> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [contacts, setContacts] = useState<Record<string, any>[]>([]);
  const [activities, setActivities] = useState<{ id: string; type: string; title: string; description?: string | null; created_at: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/crm/companies/${companyId}`).then((r) => r.json()),
      fetch(`/api/crm/contacts?company_id=${companyId}&limit=20`).then((r) => r.json()),
      fetch(`/api/crm/activities?company_id=${companyId}&limit=20`).then((r) => r.json()),
    ]).then(([companyRes, contactsRes, actRes]) => {
      if (companyRes.success) setCompany(companyRes.data);
      if (contactsRes.success) setContacts(contactsRes.data);
      if (actRes.success) setActivities(actRes.data);
      setIsLoading(false);
    });
  }, [companyId]);

  if (isLoading) {
    return <PageContainer><Skeleton className="h-64 w-full" /></PageContainer>;
  }

  if (!company) {
    return <PageContainer><p>Company not found</p></PageContainer>;
  }

  const handleEdit = async (values: Record<string, string>) => {
    const res = await fetch(`/api/crm/companies/${companyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const json = await res.json();
    if (json.success) {
      setCompany(json.data);
      toast.success("Company updated");
    }
  };

  const initials = String(company.name).slice(0, 2).toUpperCase();

  return (
    <PageContainer>
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/companies"><ArrowLeft className="size-4 mr-1" />Back to Companies</Link>
        </Button>
      </div>

      <div className="flex items-start gap-4 mb-6">
        <Avatar className="size-16">
          <AvatarFallback className="text-lg bg-primary/10 text-primary">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold">{String(company.name)}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            {company.industry && <span>{String(company.industry)}</span>}
            {company.size && <span>{String(company.size)} employees</span>}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <ScoreBadge score={Number(company.ai_health_score)} label="health" size="md" />
            <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>
              <Pencil className="size-3.5 mr-1" />
              Edit
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm">Company Info</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {company.website && (
              <div className="flex items-center gap-2 text-sm">
                <Globe className="size-4 text-muted-foreground" />
                <span>{String(company.website)}</span>
              </div>
            )}
            {company.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="size-4 text-muted-foreground" />{String(company.phone)}
              </div>
            )}
            {company.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="size-4 text-muted-foreground" />{String(company.email)}
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Users className="size-4 text-muted-foreground" />{Number(company.contact_count)} contacts
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Handshake className="size-4 text-muted-foreground" />{Number(company.deal_count)} deals
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          {/* Contacts */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Contacts ({contacts.length})</CardTitle></CardHeader>
            <CardContent>
              {contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No contacts linked.</p>
              ) : (
                <div className="space-y-2">
                  {contacts.map((c) => (
                    <Link
                      key={String(c.id)}
                      href={`/dashboard/contacts/${c.id}`}
                      className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50"
                    >
                      <Avatar className="size-8">
                        <AvatarFallback className="text-xs">
                          {String(c.first_name).charAt(0)}{String(c.last_name || "").charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{String(c.first_name)} {String(c.last_name || "")}</p>
                        {c.title && <p className="text-xs text-muted-foreground">{String(c.title)}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
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

      <EntityForm
        open={showEdit}
        onOpenChange={setShowEdit}
        title="Edit Company"
        fields={companyFields}
        initialValues={{
          name: company.name || "",
          domain: company.domain || "",
          industry: company.industry || "",
          size: company.size || "",
          website: company.website || "",
          phone: company.phone || "",
        }}
        onSubmit={handleEdit}
        submitLabel="Save"
      />
    </PageContainer>
  );
}
