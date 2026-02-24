"use client";

import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import {
  MessageSquare, Phone, Mail, Calendar, Handshake,
  ArrowRightLeft, Trophy, XCircle, UserPlus, CheckSquare, Upload,
} from "lucide-react";

const typeIcons: Record<string, typeof MessageSquare> = {
  note: MessageSquare,
  call: Phone,
  email: Mail,
  meeting: Calendar,
  deal_created: Handshake,
  deal_stage_changed: ArrowRightLeft,
  deal_won: Trophy,
  deal_lost: XCircle,
  contact_created: UserPlus,
  task_completed: CheckSquare,
  import: Upload,
};

const typeColors: Record<string, string> = {
  note: "bg-landing-accent/10 text-landing-accent",
  call: "bg-landing-accent/10 text-landing-accent",
  email: "bg-landing-accent/10 text-landing-accent",
  meeting: "bg-orange-500/10 text-orange-600",
  deal_created: "bg-landing-accent/10 text-landing-accent",
  deal_stage_changed: "bg-orange-500/10 text-orange-600",
  deal_won: "bg-emerald-500/10 text-emerald-600",
  deal_lost: "bg-red-500/10 text-red-600",
  contact_created: "bg-landing-accent/10 text-landing-accent",
  task_completed: "bg-emerald-500/10 text-emerald-600",
  import: "bg-gray-500/10 text-gray-600",
};

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description?: string | null;
  created_at: string;
}

interface ActivityTimelineProps {
  activities: ActivityItem[];
  emptyMessage?: string;
}

export function ActivityTimeline({ activities, emptyMessage }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">{emptyMessage || "No activity yet"}</p>
    );
  }

  return (
    <div className="space-y-0">
      {activities.map((activity, i) => {
        const Icon = typeIcons[activity.type] || MessageSquare;
        const colorClass = typeColors[activity.type] || "bg-gray-500/10 text-gray-600";

        return (
          <div key={activity.id} className="flex gap-4 py-4">
            <div className="flex flex-col items-center">
              <div className={cn("flex size-8 items-center justify-center rounded-full", colorClass)}>
                <Icon className="size-4" />
              </div>
              {i < activities.length - 1 && (
                <div className="w-px flex-1 bg-border mt-2" />
              )}
            </div>
            <div className="flex-1 pb-2">
              <p className="text-sm font-medium">{activity.title}</p>
              {activity.description && (
                <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {formatRelativeTime(new Date(activity.created_at))}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
