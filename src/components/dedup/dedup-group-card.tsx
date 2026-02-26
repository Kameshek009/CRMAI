"use client";

import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/i18n";
import { Users, Building2, Mail, Phone, Type } from "lucide-react";
import { cn } from "@/lib/utils";

interface DuplicateGroup {
  match_key: string;
  match_type: string;
  records: Record<string, unknown>[];
}

const MATCH_ICONS: Record<string, typeof Mail> = {
  email: Mail,
  phone: Phone,
  name: Type,
  domain: Type,
};

const MATCH_COLORS: Record<string, string> = {
  email: "bg-red-500/10 text-red-600 border-red-200/50",
  phone: "bg-amber-500/10 text-amber-600 border-amber-200/50",
  name: "bg-blue-500/10 text-blue-600 border-blue-200/50",
  domain: "bg-emerald-500/10 text-emerald-600 border-emerald-200/50",
};

export const DedupGroupCard = memo(function DedupGroupCard({
  group,
  entityType,
  onClick,
}: {
  group: DuplicateGroup;
  entityType: "contacts" | "companies";
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const MatchIcon = MATCH_ICONS[group.match_type] || Type;
  const matchColor = MATCH_COLORS[group.match_type] || "";
  const EntityIcon = entityType === "contacts" ? Users : Building2;

  const getName = (r: Record<string, unknown>) => {
    if (entityType === "contacts") {
      return `${r.first_name || ""} ${r.last_name || ""}`.trim() || "—";
    }
    return (r.name as string) || "—";
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors text-left w-full"
    >
      <div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
        <EntityIcon className="size-5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className={cn("text-[10px] border", matchColor)}>
            <MatchIcon className="size-3 mr-1" />
            {t(`crm.dedup.matchTypes.${group.match_type}`)}
          </Badge>
          <span className="text-xs text-muted-foreground">{group.match_key}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {group.records.map((r, i) => (
            <span key={(r as Record<string, string>).id}>
              {i > 0 && <span className="text-muted-foreground mx-1">/</span>}
              <span className="font-medium">{getName(r)}</span>
            </span>
          ))}
        </div>
      </div>
      <Badge variant="secondary" className="shrink-0">
        {group.records.length} {t("crm.dedup.records")}
      </Badge>
    </button>
  );
});
