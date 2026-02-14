"use client";

import { useState, useEffect, useCallback } from "react";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ContactCard } from "@/components/crm/contact-card";
import { EntityForm, type FormField } from "@/components/crm/entity-form";
import { ImportWizard } from "@/components/crm/import-wizard";
import { EmptyState } from "@/components/crm/empty-state";
import { Plus, Search, Upload, Users } from "lucide-react";
import { toast } from "sonner";

const statusFilters = [
  { label: "All", value: "" },
  { label: "Lead", value: "lead" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Churned", value: "churned" },
];

const contactFields: FormField[] = [
  { name: "first_name", label: "First Name", type: "text", required: true, placeholder: "John" },
  { name: "last_name", label: "Last Name", type: "text", placeholder: "Doe" },
  { name: "email", label: "Email", type: "email", placeholder: "john@example.com" },
  { name: "phone", label: "Phone", type: "tel", placeholder: "+1 (555) 123-4567" },
  { name: "title", label: "Job Title", type: "text", placeholder: "Sales Manager" },
  {
    name: "status", label: "Status", type: "select",
    options: [
      { label: "Lead", value: "lead" },
      { label: "Active", value: "active" },
      { label: "Inactive", value: "inactive" },
    ],
  },
];

interface ContactData {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  title: string | null;
  status: string;
  engagement_score: number;
  companies: { id: string; name: string } | null;
}

export function ContactsContent() {
  const [contacts, setContacts] = useState<ContactData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchContacts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      params.set("limit", "50");

      const res = await fetch(`/api/crm/contacts?${params}`);
      const json = await res.json();
      if (json.success) {
        setContacts(json.data);
        setTotal(json.total || 0);
      }
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleCreate = async (values: Record<string, string>) => {
    const res = await fetch("/api/crm/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const json = await res.json();
    if (json.success) {
      toast.success("Contact created");
      fetchContacts();
    } else {
      toast.error(json.error || "Failed to create contact");
      throw new Error(json.error);
    }
  };

  return (
    <PageContainer>
      <PageHeader title="Contacts" description={`${total} contact${total !== 1 ? "s" : ""}`}>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
            <Upload className="size-4 mr-1" />
            Import
          </Button>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="size-4 mr-1" />
            New Contact
          </Button>
        </div>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {statusFilters.map((f) => (
            <Badge
              key={f.value}
              variant={statusFilter === f.value ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Contact List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : contacts.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No contacts yet"
          description="Add your first contact to start building your CRM."
          actionLabel="Add Contact"
          onAction={() => setShowForm(true)}
        />
      ) : (
        <div className="space-y-2">
          {contacts.map((contact) => (
            <ContactCard
              key={contact.id}
              id={contact.id}
              firstName={contact.first_name}
              lastName={contact.last_name}
              email={contact.email}
              phone={contact.phone}
              title={contact.title}
              status={contact.status}
              engagementScore={contact.engagement_score}
              companyName={contact.companies?.name}
            />
          ))}
        </div>
      )}

      <EntityForm
        open={showForm}
        onOpenChange={setShowForm}
        title="New Contact"
        fields={contactFields}
        onSubmit={handleCreate}
      />

      <ImportWizard
        open={showImport}
        onOpenChange={setShowImport}
        onComplete={fetchContacts}
      />
    </PageContainer>
  );
}
