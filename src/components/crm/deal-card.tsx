"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Building2, User, GripVertical, Calendar, AlertTriangle } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import Link from "next/link";

export interface DealForCard {
  id: string;
  title: string;
  value: number;
  ai_win_probability: number;
  expected_close_date: string | null;
  is_rotting?: boolean;
  assigned_to?: string | null;
  contacts: { id: string; first_name: string; last_name: string | null } | null;
  companies: { id: string; name: string } | null;
}

// ── Pure presentation (no hooks) ────────────────────────────────────────

function DealCardInner({
  deal,
  dragHandle,
  className,
  locale,
  t,
}: {
  deal: DealForCard;
  dragHandle?: React.ReactNode;
  className?: string;
  locale?: string;
  t?: (key: string, params?: Record<string, string | number>) => string;
}) {
  const contactName = deal.contacts
    ? `${deal.contacts.first_name} ${deal.contacts.last_name || ""}`.trim()
    : null;

  const prob = deal.ai_win_probability ?? 0;
  const probColor =
    prob >= 70
      ? "text-emerald-600 border-emerald-200 dark:border-emerald-800/40 bg-emerald-500/10"
      : prob >= 40
        ? "text-amber-600 border-amber-200 dark:border-amber-800/40 bg-amber-500/10"
        : "text-red-600 border-red-200 dark:border-red-800/40 bg-red-500/10";
  const probLabel = t
    ? (prob >= 70 ? t("crm.pipeline.hot") : prob >= 40 ? t("crm.pipeline.warm") : t("crm.pipeline.atRisk"))
    : (prob >= 70 ? "Hot" : prob >= 40 ? "Warm" : "At Risk");
  const probDot = prob >= 70 ? "bg-emerald-500" : prob >= 40 ? "bg-amber-500" : "bg-red-500";

  const dateLocale = locale === "ru" ? "ru-RU" : "en-US";

  return (
    <Card className={cn(
      "p-3 transition-all group premium-card card-shine border bg-card",
      deal.is_rotting && "border-l-[3px] border-l-red-500",
      className
    )}>
      <div className="flex items-start gap-2 relative z-[1]">
        {dragHandle}
        <div className="flex-1 min-w-0">
          <Link
            href={`/dashboard/deals/${deal.id}`}
            className="font-semibold text-sm hover:text-primary transition-colors truncate block"
          >
            {deal.title}
          </Link>
          <p className="text-base font-bold mt-0.5 tracking-tight tabular-nums">
            ${Number(deal.value).toLocaleString()}
          </p>

          {(contactName || deal.companies?.name) && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-muted-foreground">
              {deal.companies?.name && (
                <span className="flex items-center gap-1 truncate max-w-[120px] hover:text-foreground transition-colors">
                  <Building2 className="size-3 shrink-0" />
                  {deal.companies.name}
                </span>
              )}
              {contactName && (
                <span className="flex items-center gap-1 truncate max-w-[120px] hover:text-foreground transition-colors">
                  <User className="size-3 shrink-0" />
                  {contactName}
                </span>
              )}
            </div>
          )}

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1.5">
              <Badge
                variant="outline"
                className={cn("text-[10px] px-2 py-0 badge-shimmer", probColor)}
                aria-label={`Win probability: ${probLabel}, ${prob}%`}
              >
                <div className={cn("w-1.5 h-1.5 rounded-full mr-1", probDot)} />
                {probLabel} {prob}%
              </Badge>
              {deal.is_rotting && t && (
                <Badge variant="outline" className="text-[10px] px-2 py-0 text-red-600 border-red-200 dark:border-red-800/40 bg-red-500/10">
                  <AlertTriangle className="size-2.5 mr-1" />
                  {t("crm.pipeline.rottingLabel")}
                </Badge>
              )}
            </div>
            {deal.expected_close_date && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Calendar className="size-2.5" />
                {new Date(deal.expected_close_date).toLocaleDateString(dateLocale, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

// ── Draggable wrapper (uses hooks) ──────────────────────────────────────

export function DealCard({ deal }: { deal: DealForCard }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
  });
  const { t, locale } = useTranslation();

  const style = transform
    ? { transform: CSS.Transform.toString(transform), opacity: isDragging ? 0.3 : 1 }
    : undefined;

  const handle = (
    <button
      {...attributes}
      {...listeners}
      aria-label={`Drag deal: ${deal.title}`}
      className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-all shrink-0 hover:scale-110"
    >
      <GripVertical className="size-4" />
    </button>
  );

  return (
    <div ref={setNodeRef} style={style}>
      <DealCardInner
        deal={deal}
        dragHandle={handle}
        locale={locale}
        t={t}
        className={isDragging ? "shadow-xl ring-2 ring-primary/20 scale-[1.02]" : "hover:shadow-md"}
      />
    </div>
  );
}

// ── Overlay variant (NO hooks — safe for DragOverlay) ───────────────────

export function DealCardOverlay({ deal }: { deal: DealForCard }) {
  return (
    <DealCardInner
      deal={deal}
      className="shadow-2xl ring-2 ring-primary/30 rotate-2 scale-105"
    />
  );
}
