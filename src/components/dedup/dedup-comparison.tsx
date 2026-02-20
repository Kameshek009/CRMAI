"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/i18n";
import { ArrowLeft, GitMerge, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DuplicateGroup {
  match_key: string;
  match_type: string;
  records: Record<string, unknown>[];
}

const CONTACT_FIELDS = ["first_name", "last_name", "email", "phone", "status"] as const;
const COMPANY_FIELDS = ["name", "domain", "industry", "size"] as const;

export function DedupComparison({
  group,
  entityType,
  onBack,
  onMerged,
}: {
  group: DuplicateGroup;
  entityType: "contacts" | "companies";
  onBack: () => void;
  onMerged: (masterId: string, mergedIds: string[]) => void;
}) {
  const { t } = useTranslation();
  const [masterId, setMasterId] = useState<string>((group.records[0] as Record<string, string>).id);
  const [fieldOverrides, setFieldOverrides] = useState<Record<string, unknown>>({});
  const [merging, setMerging] = useState(false);

  const fields = entityType === "contacts" ? CONTACT_FIELDS : COMPANY_FIELDS;

  const handleFieldSelect = (field: string, value: unknown) => {
    setFieldOverrides((prev) => ({ ...prev, [field]: value }));
  };

  const handleMerge = async () => {
    const mergeIds = group.records
      .map((r) => (r as Record<string, string>).id)
      .filter((id) => id !== masterId);

    setMerging(true);
    try {
      const res = await fetch("/api/crm/dedup/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity_type: entityType,
          master_id: masterId,
          merge_ids: mergeIds,
          field_overrides: Object.keys(fieldOverrides).length > 0 ? fieldOverrides : undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        onMerged(masterId, mergeIds);
      } else {
        toast.error(json.error || t("crm.dedup.mergeFailed"));
      }
    } catch {
      toast.error(t("crm.dedup.mergeFailed"));
    } finally {
      setMerging(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="size-4 mr-1" />
          {t("crm.dedup.back")}
        </Button>
        <h3 className="text-sm font-semibold">{t("crm.dedup.compareAndMerge")}</h3>
      </div>

      {/* Master selection */}
      <div className="text-xs text-muted-foreground mb-2">{t("crm.dedup.selectMaster")}</div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-3 py-2 text-xs font-medium text-muted-foreground text-left w-28">
                {t("crm.dedup.field")}
              </th>
              {group.records.map((r) => {
                const id = (r as Record<string, string>).id;
                return (
                  <th key={id} className="px-3 py-2 text-left">
                    <button
                      type="button"
                      onClick={() => setMasterId(id)}
                      className={cn(
                        "flex items-center gap-1.5 text-xs font-medium rounded-md px-2 py-1 transition-colors",
                        masterId === id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      {masterId === id && <Check className="size-3" />}
                      {t("crm.dedup.master")}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {fields.map((field) => (
              <tr key={field} className="border-b border-border last:border-0">
                <td className="px-3 py-2 text-xs text-muted-foreground font-medium">
                  {t(`crm.dedup.fields.${field}`)}
                </td>
                {group.records.map((r) => {
                  const id = (r as Record<string, string>).id;
                  const value = (r as Record<string, unknown>)[field];
                  const isSelected =
                    fieldOverrides[field] !== undefined
                      ? fieldOverrides[field] === value
                      : id === masterId;

                  return (
                    <td key={id} className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => handleFieldSelect(field, value)}
                        className={cn(
                          "text-sm px-2 py-0.5 rounded transition-colors",
                          isSelected
                            ? "bg-primary/10 text-primary font-medium"
                            : "hover:bg-muted text-foreground"
                        )}
                      >
                        {value != null ? String(value) : "—"}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleMerge} disabled={merging}>
          {merging ? (
            <Loader2 className="size-4 animate-spin mr-1.5" />
          ) : (
            <GitMerge className="size-4 mr-1.5" />
          )}
          {t("crm.dedup.mergeButton")}
        </Button>
        <p className="text-xs text-muted-foreground">{t("crm.dedup.mergeHint")}</p>
      </div>
    </div>
  );
}
