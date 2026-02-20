"use client";

import { Handshake, CheckSquare, Users, Bell, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
}

const TYPE_ICONS: Record<string, LucideIcon> = {
  deal_assigned: Handshake,
  deal_stage_changed: Handshake,
  task_due_soon: CheckSquare,
  task_overdue: CheckSquare,
  new_team_member: Users,
};

const TYPE_COLORS: Record<string, string> = {
  deal_assigned: "text-amber-500",
  deal_stage_changed: "text-amber-500",
  task_due_soon: "text-purple-500",
  task_overdue: "text-red-500",
  new_team_member: "text-blue-500",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function NotificationItem({
  notification,
  onClick,
}: {
  notification: Notification;
  onClick: () => void;
}) {
  const Icon = TYPE_ICONS[notification.type] || Bell;
  const color = TYPE_COLORS[notification.type] || "text-muted-foreground";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 w-full p-3 text-left transition-colors hover:bg-muted/50 rounded-lg",
        !notification.is_read && "bg-primary/5"
      )}
    >
      <div className={cn("mt-0.5 shrink-0", color)}>
        <Icon className="size-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm leading-tight", !notification.is_read && "font-medium")}>
          {notification.title}
        </p>
        {notification.message && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{notification.message}</p>
        )}
        <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(notification.created_at)}</p>
      </div>
      {!notification.is_read && (
        <div className="mt-1.5 shrink-0">
          <div className="size-2 rounded-full bg-primary" />
        </div>
      )}
    </button>
  );
}
