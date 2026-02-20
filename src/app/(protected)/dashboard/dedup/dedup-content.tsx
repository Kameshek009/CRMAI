"use client";

import { useState, useCallback } from "react";
import { PageContainer, PageHeader } from "@/components/dashboard/page-container";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { GitMerge, Search, Users, Building2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DedupGroupCard } from "@/components/dedup/dedup-group-card";
import { DedupComparison } from "@/components/dedup/dedup-comparison";

interface DuplicateGroup {
  match_key: string;
  match_type: string;
  records: Record<string, unknown>[];
}

export function DedupContent() {
  const { t } = useTranslation();
  const [entity, setEntity] = useState<"contacts" | "companies">("contacts");
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<DuplicateGroup | null>(null);

  const handleScan = useCallback(async () => {
    setLoading(true);
    setSelectedGroup(null);
    try {
      const res = await fetch(`/api/crm/dedup?entity=${entity}`);
      const json = await res.json();
      if (json.success) {
        setGroups(json.data || []);
        setScanned(true);
        if ((json.data || []).length === 0) {
          toast.success(t("crm.dedup.noDuplicates"));
        }
      } else {
        toast.error(json.error || t("crm.dedup.scanFailed"));
      }
    } catch {
      toast.error(t("crm.dedup.scanFailed"));
    } finally {
      setLoading(false);
    }
  }, [entity, t]);

  const handleMerged = (masterId: string, mergedIds: string[]) => {
    setGroups((prev) =>
      prev.filter((g) => {
        const ids = g.records.map((r) => (r as Record<string, string>).id);
        return !mergedIds.some((mid) => ids.includes(mid));
      })
    );
    setSelectedGroup(null);
    toast.success(t("crm.dedup.merged"));
  };

  return (
    <PageContainer>
      <PageHeader
        title={t("crm.dedup.title")}
        description={t("crm.dedup.description")}
      />

      <div className="flex items-center gap-3">
        {/* Entity toggle */}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => { setEntity("contacts"); setScanned(false); setGroups([]); setSelectedGroup(null); }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
              entity === "contacts"
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            <Users className="size-3.5" />
            {t("crm.dedup.contacts")}
          </button>
          <button
            type="button"
            onClick={() => { setEntity("companies"); setScanned(false); setGroups([]); setSelectedGroup(null); }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
              entity === "companies"
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            <Building2 className="size-3.5" />
            {t("crm.dedup.companies")}
          </button>
        </div>

        <Button size="sm" onClick={handleScan} disabled={loading}>
          {loading ? (
            <Loader2 className="size-3.5 animate-spin mr-1.5" />
          ) : (
            <Search className="size-3.5 mr-1.5" />
          )}
          {t("crm.dedup.scan")}
        </Button>

        {scanned && (
          <Badge variant="outline" className="text-xs">
            {groups.length} {t("crm.dedup.groupsFound")}
          </Badge>
        )}
      </div>

      {selectedGroup ? (
        <DedupComparison
          group={selectedGroup}
          entityType={entity}
          onBack={() => setSelectedGroup(null)}
          onMerged={handleMerged}
        />
      ) : !scanned ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <GitMerge className="size-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">{t("crm.dedup.scanPrompt")}</p>
          <p className="text-xs text-muted-foreground/70 mt-1">{t("crm.dedup.scanPromptDesc")}</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <GitMerge className="size-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">{t("crm.dedup.noDuplicates")}</p>
          <p className="text-xs text-muted-foreground/70 mt-1">{t("crm.dedup.noDuplicatesDesc")}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {groups.map((group, i) => (
            <DedupGroupCard
              key={`${group.match_type}-${group.match_key}-${i}`}
              group={group}
              entityType={entity}
              onClick={() => setSelectedGroup(group)}
            />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
