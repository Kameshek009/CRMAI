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
import { ArrowLeft, Globe, Phone, Mail, Users, Handshake } from "lucide-react";

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
          <ScoreBadge score={Number(company.ai_health_score)} label="health" size="md" />
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
    </PageContainer>
  );
}
