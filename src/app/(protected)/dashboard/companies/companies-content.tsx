"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { CompanyCard } from "@/components/crm/company-card";
import { EntityForm } from "@/components/crm/entity-form";
import { companyFields } from "@/lib/crm/field-definitions";
import { EmptyState } from "@/components/crm/empty-state";
import { BulkActionBar } from "@/components/crm/bulk-action-bar";
import { ConfirmDialog } from "@/components/crm/confirm-dialog";
import { useMultiSelect } from "@/hooks/use-multi-select";
import { cn } from "@/lib/utils";
import {
  Plus,
  Search,
  Building2,
  Loader2,
  ArrowUpDown,
  Heart,
  Factory,
  Users,
  ListFilter,
} from "lucide-react";
import { toast } from "sonner";

const sizeFilters = [
  { label: "All Sizes", value: "" },
  { label: "1-10", value: "1-10" },
  { label: "11-50", value: "11-50" },
  { label: "51-200", value: "51-200" },
  { label: "201-500", value: "201-500" },
  { label: "501+", value: "501+" },
];

const sortOptions = [
  { label: "Name A-Z", value: "name_asc" },
  { label: "Name Z-A", value: "name_desc" },
  { label: "Health Score", value: "health_desc" },
  { label: "Newest", value: "created_desc" },
];

const healthLabels: Record<string, { label: string; color: string }> = {
  excellent: { label: "Excellent", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
  good: { label: "Good", color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  fair: { label: "Fair", color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  poor: { label: "Poor", color: "text-red-500 bg-red-500/10 border-red-500/20" },
};

interface CompanyData {
  id: string;
  name: string;
  industry: string | null;
  size: string | null;
  domain: string | null;
  ai_health_score: number;
  created_at?: string;
}

export function CompaniesContent() {
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [total, setTotal] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [industryFilter, setIndustryFilter] = useState("");
  const [sizeFilter, setSizeFilter] = useState("");
  const [sortBy, setSortBy] = useState("name_asc");
  const [showFilters, setShowFilters] = useState(false);

  const PAGE_SIZE = 50;

  const { selectedIds, toggle, selectAll, deselectAll, isSelected, isAllSelected, count } = useMultiSelect();

  const fetchCompanies = useCallback(async (offset = 0, append = false) => {
    if (!append) setIsLoading(true);
    else setIsLoadingMore(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (search) params.set("search", search);
      params.set("offset", String(offset));

      const res = await fetch(`/api/crm/companies?${params}`);
      const json = await res.json();
      if (json.success) {
        setCompanies((prev) => append ? [...prev, ...json.data] : json.data);
        setTotal(json.total || 0);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [search]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    deselectAll();
  }, [search, deselectAll]);

  // Client-side filtering and sorting
  const filteredCompanies = useMemo(() => {
    let result = [...companies];

    if (industryFilter) {
      result = result.filter((c) => c.industry?.toLowerCase() === industryFilter.toLowerCase());
    }
    if (sizeFilter) {
      result = result.filter((c) => c.size === sizeFilter);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === "name_asc") return a.name.localeCompare(b.name);
      if (sortBy === "name_desc") return b.name.localeCompare(a.name);
      if (sortBy === "health_desc") return b.ai_health_score - a.ai_health_score;
      return 0;
    });

    return result;
  }, [companies, industryFilter, sizeFilter, sortBy]);

  // Extract unique industries for filter
  const industries = useMemo(() => {
    const set = new Set<string>();
    companies.forEach((c) => { if (c.industry) set.add(c.industry); });
    return Array.from(set).sort();
  }, [companies]);

  // Health stats
  const healthStats = useMemo(() => {
    const buckets = { excellent: 0, good: 0, fair: 0, poor: 0 };
    companies.forEach((c) => {
      if (c.ai_health_score >= 80) buckets.excellent++;
      else if (c.ai_health_score >= 60) buckets.good++;
      else if (c.ai_health_score >= 40) buckets.fair++;
      else buckets.poor++;
    });
    return buckets;
  }, [companies]);

  const hasMore = companies.length < total;

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

  const handleBulkDelete = async () => {
    setIsBulkLoading(true);
    try {
      const res = await fetch("/api/crm/companies/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", ids: selectedIds }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Deleted ${selectedIds.length} compan${selectedIds.length !== 1 ? "ies" : "y"}`);
        deselectAll();
        fetchCompanies();
      } else {
        toast.error(json.error || "Failed to delete companies");
      }
    } finally {
      setIsBulkLoading(false);
      setConfirmDelete(false);
    }
  };

  const visibleIds = filteredCompanies.map((c) => c.id);
  const allSelected = isAllSelected(visibleIds);

  return (
    <PageContainer>
      <PageHeader title="Companies" description={`${total} compan${total !== 1 ? "ies" : "y"}`}>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="size-4 mr-1" />
          New Company
        </Button>
      </PageHeader>

      {/* Health Overview */}
      {companies.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(Object.entries(healthStats) as [keyof typeof healthLabels, number][]).map(([key, value], i) => {
            const info = healthLabels[key];
            return (
              <motion.div key={key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
                <Card className="glass-card">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border", info.color)}>
                      <Heart className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-lg font-bold">{value}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{info.label}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search companies..."
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className={showFilters ? "bg-muted" : ""}>
              <ListFilter className="size-4 mr-1" />
              Filters
              {(industryFilter || sizeFilter) && <Badge className="ml-1.5 h-4 px-1 text-[9px]">!</Badge>}
            </Button>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm">
              {sortOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="flex flex-wrap gap-3">
            {industries.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                <span className="text-xs text-muted-foreground self-center mr-1">
                  <Factory className="w-3 h-3 inline mr-0.5" />Industry:
                </span>
                <Badge
                  variant={industryFilter === "" ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setIndustryFilter("")}
                >
                  All
                </Badge>
                {industries.slice(0, 8).map((ind) => (
                  <Badge
                    key={ind}
                    variant={industryFilter === ind ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setIndustryFilter(ind)}
                  >
                    {ind}
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex gap-1">
              <span className="text-xs text-muted-foreground self-center mr-1">
                <Users className="w-3 h-3 inline mr-0.5" />Size:
              </span>
              {sizeFilters.map((f) => (
                <Badge
                  key={f.value}
                  variant={sizeFilter === f.value ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setSizeFilter(f.value)}
                >
                  {f.label}
                </Badge>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : filteredCompanies.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={search || industryFilter || sizeFilter ? "No matching companies" : "No companies yet"}
          description={search || industryFilter || sizeFilter ? "Try adjusting your filters." : "Add your first company to organize your contacts."}
          actionLabel={!(search || industryFilter || sizeFilter) ? "Add Company" : undefined}
          onAction={!(search || industryFilter || sizeFilter) ? () => setShowForm(true) : undefined}
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
            <span className="text-xs text-muted-foreground">{filteredCompanies.length} compan{filteredCompanies.length !== 1 ? "ies" : "y"}</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCompanies.map((company) => (
              <CompanyCard
                key={company.id}
                id={company.id}
                name={company.name}
                industry={company.industry}
                size={company.size}
                domain={company.domain}
                aiHealthScore={company.ai_health_score}
                selectable
                selected={isSelected(company.id)}
                onSelectToggle={toggle}
              />
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={isLoadingMore}
                onClick={() => fetchCompanies(companies.length, true)}
              >
                {isLoadingMore && <Loader2 className="size-4 mr-2 animate-spin" />}
                Load More ({companies.length} of {total})
              </Button>
            </div>
          )}
        </div>
      )}

      <EntityForm
        open={showForm}
        onOpenChange={setShowForm}
        title="New Company"
        fields={companyFields}
        onSubmit={handleCreate}
      />

      <BulkActionBar
        selectedCount={count}
        onDeselectAll={deselectAll}
        actions={[
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
        title="Delete companies"
        description={`Are you sure you want to delete ${count} compan${count !== 1 ? "ies" : "y"}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        isLoading={isBulkLoading}
        onConfirm={handleBulkDelete}
      />
    </PageContainer>
  );
}
