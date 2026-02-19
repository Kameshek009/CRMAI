"use client";

import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import {
  FileText, Phone, Mail, Users, Handshake,
  CheckCircle2, ArrowRightLeft, Trophy, XCircle,
  Upload, Zap, RefreshCw, MessageSquare,
} from "lucide-react";
import type { Activity, CrmActivityType } from "@/types/crm";

// ============================================================================
// Activity Icon Config
// ============================================================================

const ACTIVITY_CONFIG: Record<CrmActivityType, { icon: typeof FileText; color: string }> = {
  note: { icon: FileText, color: "text-blue-500 bg-blue-500/10" },
  call: { icon: Phone, color: "text-emerald-500 bg-emerald-500/10" },
  email: { icon: Mail, color: "text-purple-500 bg-purple-500/10" },
  meeting: { icon: Users, color: "text-amber-500 bg-amber-500/10" },
  deal_created: { icon: Handshake, color: "text-blue-500 bg-blue-500/10" },
  deal_stage_changed: { icon: ArrowRightLeft, color: "text-amber-500 bg-amber-500/10" },
  deal_won: { icon: Trophy, color: "text-emerald-500 bg-emerald-500/10" },
  deal_lost: { icon: XCircle, color: "text-red-500 bg-red-500/10" },
  contact_created: { icon: Users, color: "text-blue-500 bg-blue-500/10" },
  task_completed: { icon: CheckCircle2, color: "text-emerald-500 bg-emerald-500/10" },
  import: { icon: Upload, color: "text-gray-500 bg-gray-500/10" },
  lead_created: { icon: Zap, color: "text-orange-500 bg-orange-500/10" },
  lead_converted: { icon: RefreshCw, color: "text-emerald-500 bg-emerald-500/10" },
  lead_status_changed: { icon: ArrowRightLeft, color: "text-amber-500 bg-amber-500/10" },
};

const DEFAULT_CONFIG = { icon: MessageSquare, color: "text-gray-500 bg-gray-500/10" };

// ============================================================================
// Component
// ============================================================================

interface ActivityStreamProps {
  activities: Activity[];
  loading?: boolean;
  emptyMessage?: string;
  maxHeight?: string;
  className?: string;
}

export function ActivityStream({
  activities,
  loading = false,
  emptyMessage = "No activity yet",
  maxHeight,
  className,
}: ActivityStreamProps) {
  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-48 rounded bg-muted animate-pulse" />
              <div className="h-3 w-24 rounded bg-muted animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      className={cn("relative", className)}
      style={maxHeight ? { maxHeight, overflowY: "auto" } : undefined}
    >
      {/* Vertical connecting line */}
      <div className="absolute left-4 top-4 bottom-4 w-px bg-border" />

      <div className="space-y-0">
        {activities.map((activity, index) => {
          const config = ACTIVITY_CONFIG[activity.type] || DEFAULT_CONFIG;
          const Icon = config.icon;
          const isLast = index === activities.length - 1;

          return (
            <div
              key={activity.id}
              className={cn("relative flex gap-3 px-1 py-3", !isLast && "pb-3")}
            >
              {/* Icon */}
              <div
                className={cn(
                  "relative z-10 flex h-8 w-8 items-center justify-center rounded-full shrink-0",
                  config.color
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={1.5} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-sm">
                  <span className="font-medium">{activity.title}</span>
                </p>
                {activity.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                    {activity.description}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatRelativeTime(new Date(activity.createdAt))}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
