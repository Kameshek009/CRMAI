"use client";

import { useState, useEffect, useCallback } from "react";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { ContactCard } from "@/components/crm/contact-card";
import { EntityForm, type FormField } from "@/components/crm/entity-form";
import { ImportWizard } from "@/components/crm/import-wizard";
import { EmptyState } from "@/components/crm/empty-state";
import { BulkActionBar } from "@/components/crm/bulk-action-bar";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import { useMultiSelect } from "@/hooks/use-multi-select";
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  const { selectedIds, toggle, selectAll, deselectAll, isSelected, isAllSelected, count } = useMultiSelect();

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

  // Reset selection when filters change
  useEffect(() => {
    deselectAll();
  }, [search, statusFilter, deselectAll]);

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

  const handleBulkDelete = async () => {
    setIsBulkLoading(true);
    try {
      const res = await fetch("/api/crm/contacts/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", ids: selectedIds }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Deleted ${selectedIds.length} contact${selectedIds.length !== 1 ? "s" : ""}`);
        deselectAll();
        fetchContacts();
      } else {
        toast.error(json.error || "Failed to delete contacts");
      }
    } finally {
      setIsBulkLoading(false);
      setConfirmDelete(false);
    }
  };

  const handleBulkStatusChange = async (status: string) => {
    setIsBulkLoading(true);
    try {
      const res = await fetch("/api/crm/contacts/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_status", ids: selectedIds, status }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Updated ${selectedIds.length} contact${selectedIds.length !== 1 ? "s" : ""} to ${status}`);
        deselectAll();
        fetchContacts();
      } else {
        toast.error(json.error || "Failed to update contacts");
      }
    } finally {
      setIsBulkLoading(false);
    }
  };

  const visibleIds = contacts.map((c) => c.id);
  const allSelected = isAllSelected(visibleIds);

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
          {/* Select All */}
          <div className="flex items-center gap-2 px-4 py-1">
            <Checkbox
              checked={allSelected}
              onCheckedChange={() => allSelected ? deselectAll() : selectAll(visibleIds)}
              className="size-5"
            />
            <span className="text-sm text-muted-foreground">Select all</span>
          </div>
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
              selectable
              selected={isSelected(contact.id)}
              onSelectToggle={toggle}
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

      <BulkActionBar
        selectedCount={count}
        onDeselectAll={deselectAll}
        actions={[
          {
            label: "Change Status",
            dropdown: [
              { label: "Lead", value: "lead" },
              { label: "Active", value: "active" },
              { label: "Inactive", value: "inactive" },
              { label: "Churned", value: "churned" },
            ],
            onDropdownSelect: handleBulkStatusChange,
          },
          {
            label: "Delete",
            variant: "destructive",
            onClick: () => setConfirmDelete(true),
          },
        ]}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete contacts"
        description={`Are you sure you want to delete ${count} contact${count !== 1 ? "s" : ""}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        isLoading={isBulkLoading}
        onConfirm={handleBulkDelete}
      />
    </PageContainer>
  );
}
