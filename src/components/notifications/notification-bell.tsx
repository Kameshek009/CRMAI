"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTranslation } from "@/lib/i18n";
import { useWorkspace } from "@/contexts/team-context";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { NotificationItem } from "./notification-item";

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

const ENTITY_ROUTES: Record<string, string> = {
  deal: "/dashboard/deals",
  contact: "/dashboard/contacts",
  company: "/dashboard/companies",
  task: "/dashboard/tasks",
};

export function NotificationBell() {
  const { t } = useTranslation();
  const router = useRouter();
  const { currentWorkspace } = useWorkspace();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/crm/notifications");
      const json = await res.json();
      if (json.success) {
        setNotifications(json.data || []);
        setUnreadCount(json.unread_count || 0);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Resolve our account_id once so the realtime filter only delivers
  // notifications meant for this user (not the whole team).
  useEffect(() => {
    fetch("/api/account/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.success) setAccountId(j.data.id);
      })
      .catch(() => {});
  }, []);

  // Realtime subscription
  useEffect(() => {
    if (!currentWorkspace?.id || !accountId) return;

    const channel = supabase
      .channel(`notifications-realtime:${accountId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `account_id=eq.${accountId}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev].slice(0, 50));
          setUnreadCount((prev) => prev + 1);
          // Only toast when the bell isn't open — otherwise the row is
          // already visible inside the popover.
          if (!open) {
            toast.info(newNotif.title, {
              description: newNotif.message ?? undefined,
            });
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // `open` intentionally omitted: re-subscribing every popover toggle
    // would tear down the channel. We read it via closure instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorkspace?.id, accountId]);

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/crm/notifications/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // silent
    }
  };

  const handleClick = async (notif: Notification) => {
    // Mark as read
    if (!notif.is_read) {
      try {
        await fetch("/api/crm/notifications/read", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: [notif.id] }),
        });
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // silent
      }
    }

    // Navigate to entity
    if (notif.entity_type && notif.entity_id) {
      const base = ENTITY_ROUTES[notif.entity_type];
      if (base) {
        router.push(`${base}/${notif.entity_id}`);
        setOpen(false);
      }
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">{t("crm.notifications.title")}</h3>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-xs text-primary hover:underline"
            >
              {t("crm.notifications.markAllRead")}
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto p-1">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="size-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">{t("crm.notifications.empty")}</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <NotificationItem
                key={notif.id}
                notification={notif}
                onClick={() => handleClick(notif)}
              />
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
