"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { ContactCard } from "@/components/crm/contact-card";
import { EntityForm } from "@/components/crm/entity-form";
import { contactFields } from "@/lib/crm/field-definitions";
import { ImportWizard } from "@/components/crm/import-wizard";
import { EmptyState } from "@/components/crm/empty-state";
import { BulkActionBar } from "@/components/crm/bulk-action-bar";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import { useMultiSelect } from "@/hooks/use-multi-select";
import { cn } from "@/lib/utils";
import {
  Plus,
  Search,
  Upload,
  Users,
  Loader2,
  ListFilter,
  UserPlus,
  UserCheck,
  UserX,
  UserMinus,
} from "lucide-react";
import { toast } from "sonner";

const statusFilters = [
  { label: "All", value: "" },
  { label: "Lead", value: "lead" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Churned", value: "churned" },
];

const sortOptions = [
  { label: "Newest", value: "created_desc" },
  { label: "Name A-Z", value: "name_asc" },
  { label: "Name Z-A", value: "name_desc" },
  { label: "Engagement", value: "engagement_desc" },
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
  source: string | null;
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
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [sortBy, setSortBy] = useState("created_desc");
  const [sourceFilter, setSourceFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const PAGE_SIZE = 50;

  const { selectedIds, toggle, selectAll, deselectAll, isSelected, isAllSelected, count } = useMultiSelect();

  const fetchContacts = useCallback(async (offset = 0, append = false) => {
    if (!append) setIsLoading(true);
    else setIsLoadingMore(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(offset));

      const res = await fetch(`/api/crm/contacts?${params}`);
      const json = await res.json();
      if (json.success) {
        setContacts((prev) => append ? [...prev, ...json.data] : json.data);
        setTotal(json.total || 0);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  useEffect(() => {
    deselectAll();
  }, [search, statusFilter, deselectAll]);

  // Client-side filtering and sorting
  const filteredContacts = useMemo(() => {
    let result = [...contacts];

    if (sourceFilter) {
      result = result.filter((c) => c.source?.toLowerCase() === sourceFilter.toLowerCase());
    }

    result.sort((a, b) => {
      if (sortBy === "name_asc") {
        return `${a.first_name} ${a.last_name || ""}`.localeCompare(`${b.first_name} ${b.last_name || ""}`);
      }
      if (sortBy === "name_desc") {
        return `${b.first_name} ${b.last_name || ""}`.localeCompare(`${a.first_name} ${a.last_name || ""}`);
      }
      if (sortBy === "engagement_desc") {
        return b.engagement_score - a.engagement_score;
      }
      return 0; // default API order
    });

    return result;
  }, [contacts, sourceFilter, sortBy]);

  // Extract unique sources
  const sources = useMemo(() => {
    const set = new Set<string>();
    contacts.forEach((c) => { if (c.source) set.add(c.source); });
    return Array.from(set).sort();
  }, [contacts]);

  // Status stats
  const statusStats = useMemo(() => {
    const counts: Record<string, number> = { lead: 0, active: 0, inactive: 0, churned: 0 };
    contacts.forEach((c) => { counts[c.status] = (counts[c.status] || 0) + 1; });
    return counts;
  }, [contacts]);

  const hasMore = contacts.length < total;

  const statusIcons: Record<string, typeof Users> = {
    lead: UserPlus,
    active: UserCheck,
    inactive: UserMinus,
    churned: UserX,
  };

  const statusColors: Record<string, string> = {
    lead: "text-indigo-500 bg-indigo-500/10",
    active: "text-emerald-500 bg-emerald-500/10",
    inactive: "text-gray-500 bg-gray-500/10",
    churned: "text-red-500 bg-red-500/10",
  };

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

  const visibleIds = filteredContacts.map((c) => c.id);
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

      {/* Status Summary */}
      {contacts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(["lead", "active", "inactive", "churned"] as const).map((status, i) => {
            const Icon = statusIcons[status] || Users;
            const color = statusColors[status] || "text-muted-foreground bg-muted";
            return (
              <div key={status}>
                <Card
                  className={cn("glass-card cursor-pointer transition-all", statusFilter === status && "ring-1 ring-primary")}
                  onClick={() => setStatusFilter(statusFilter === status ? "" : status)}
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", color)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-lg font-bold">{statusStats[status] || 0}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{status}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="space-y-3">
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
          <div className="flex gap-2">
            {sources.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className={showFilters ? "bg-muted" : ""}>
                <ListFilter className="size-4 mr-1" />
                Sources
                {sourceFilter && <Badge className="ml-1.5 h-4 px-1 text-[9px]">!</Badge>}
              </Button>
            )}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors hover:border-ring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
              aria-label="Sort contacts by"
            >
              {sortOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
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

        {showFilters && sources.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <span className="text-xs text-muted-foreground self-center mr-1">Source:</span>
            <Badge
              variant={sourceFilter === "" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSourceFilter("")}
            >
              All
            </Badge>
            {sources.map((src) => (
              <Badge
                key={src}
                variant={sourceFilter === src ? "default" : "outline"}
                className="cursor-pointer capitalize"
                onClick={() => setSourceFilter(src)}
              >
                {src}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Contact List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : filteredContacts.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search || statusFilter || sourceFilter ? "No matching contacts" : "No contacts yet"}
          description={search || statusFilter || sourceFilter ? "Try adjusting your filters." : "Add your first contact to start building your CRM."}
          actionLabel={!(search || statusFilter || sourceFilter) ? "Add Contact" : undefined}
          onAction={!(search || statusFilter || sourceFilter) ? () => setShowForm(true) : undefined}
        />
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-4 py-1">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={allSelected}
                onCheckedChange={() => allSelected ? deselectAll() : selectAll(visibleIds)}
                className="size-5"
              />
              <span className="text-sm text-muted-foreground">Select all</span>
            </div>
            <span className="text-xs text-muted-foreground">{filteredContacts.length} contact{filteredContacts.length !== 1 ? "s" : ""}</span>
          </div>
          {filteredContacts.map((contact) => (
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
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={isLoadingMore}
                onClick={() => fetchContacts(contacts.length, true)}
              >
                {isLoadingMore && <Loader2 className="size-4 mr-2 animate-spin" />}
                Load More ({contacts.length} of {total})
              </Button>
            </div>
          )}
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
