"use client";

import { useState, useEffect, useCallback } from "react";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CompanyCard } from "@/components/crm/company-card";
import { EntityForm, type FormField } from "@/components/crm/entity-form";
import { EmptyState } from "@/components/crm/empty-state";
import { Plus, Search, Building2 } from "lucide-react";
import { toast } from "sonner";

const companyFields: FormField[] = [
  { name: "name", label: "Company Name", type: "text", required: true, placeholder: "Acme Inc" },
  { name: "domain", label: "Domain", type: "text", placeholder: "acme.com" },
  { name: "industry", label: "Industry", type: "text", placeholder: "Technology" },
  {
    name: "size", label: "Company Size", type: "select",
    options: [
      { label: "1-10", value: "1-10" },
      { label: "11-50", value: "11-50" },
      { label: "51-200", value: "51-200" },
      { label: "201-500", value: "201-500" },
      { label: "500+", value: "500+" },
    ],
  },
  { name: "website", label: "Website", type: "text", placeholder: "https://acme.com" },
  { name: "phone", label: "Phone", type: "tel", placeholder: "+1 (555) 123-4567" },
];

interface CompanyData {
  id: string;
  name: string;
  industry: string | null;
  size: string | null;
  domain: string | null;
  ai_health_score: number;
}

export function CompaniesContent() {
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchCompanies = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (search) params.set("search", search);

      const res = await fetch(`/api/crm/companies?${params}`);
      const json = await res.json();
      if (json.success) {
        setCompanies(json.data);
        setTotal(json.total || 0);
      }
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleCreate = async (values: Record<string, string>) => {
    const res = await fetch("/api/crm/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const json = await res.json();
    if (json.success) {
      toast.success("Company created");
      fetchCompanies();
    } else {
      toast.error(json.error || "Failed to create company");
      throw new Error(json.error);
    }
  };

  return (
    <PageContainer>
      <PageHeader title="Companies" description={`${total} compan${total !== 1 ? "ies" : "y"}`}>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="size-4 mr-1" />
          New Company
        </Button>
      </PageHeader>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search companies..."
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : companies.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No companies yet"
          description="Add your first company to organize your contacts."
          actionLabel="Add Company"
          onAction={() => setShowForm(true)}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <CompanyCard
              key={company.id}
              id={company.id}
              name={company.name}
              industry={company.industry}
              size={company.size}
              domain={company.domain}
              aiHealthScore={company.ai_health_score}
            />
          ))}
        </div>
      )}

      <EntityForm
        open={showForm}
        onOpenChange={setShowForm}
        title="New Company"
        fields={companyFields}
        onSubmit={handleCreate}
      />
    </PageContainer>
  );
}
