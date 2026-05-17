"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSearchStore } from "@/stores/search-store";
import { useTranslation } from "@/lib/i18n";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { SidebarTrigger } from "@/components/ui/sidebar";

const segmentKeys: Record<string, string> = {
  dashboard: "nav.breadcrumb.home",
  contacts: "nav.items.contacts",
  companies: "nav.items.organizations",
  pipeline: "nav.items.pipeline",
  tasks: "nav.items.tasks",
  chats: "nav.items.aiChat",
  analytics: "nav.items.analytics",
  team: "nav.groups.workspace",
  account: "nav.items.account",
  usage: "nav.items.usage",
  upgrade: "nav.items.upgrade",
  activity: "nav.items.activity",
  sessions: "nav.items.sessions",
  console: "nav.items.console",
  billing: "nav.items.billing",
  members: "nav.items.members",
  roles: "nav.items.roles",
  settings: "nav.items.settings",
  connections: "nav.items.connections",
  deals: "nav.items.deals",
  notes: "nav.items.notes",
  automations: "nav.items.automations",
  sequences: "nav.items.sequences",
  trash: "nav.items.trash",
  dedup: "nav.items.dedup",
  goals: "nav.items.goals",
  forecast: "nav.items.forecast",
};

function isUUID(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

export function DashboardHeader() {
  const pathname = usePathname();
  const setOpen = useSearchStore((s) => s.setOpen);
  const { t } = useTranslation();

  const segments = pathname.split("/").filter(Boolean);
  // Build breadcrumb items
  const crumbs: { label: string; href: string }[] = [];
  let path = "";
  for (const seg of segments) {
    path += `/${seg}`;
    const key = segmentKeys[seg];
    const label = isUUID(seg) ? t("nav.breadcrumb.detail") : key ? t(key) : seg;
    crumbs.push({ label, href: path });
  }

  return (
    <div className="flex items-center justify-between flex-1 gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <SidebarTrigger className="md:hidden" />
        <nav className="flex items-center gap-1 text-sm min-w-0 overflow-hidden">
          {crumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1 min-w-0">
            {i > 0 && (
              <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
            )}
            {i === crumbs.length - 1 ? (
              <span className="font-medium text-foreground truncate">{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href}
                className="text-muted-foreground hover:text-foreground transition-colors truncate hidden sm:inline"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
        </nav>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <NotificationBell />
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-muted-foreground"
          onClick={() => setOpen(true)}
        >
          <Search className="size-3.5" />
          <span className="hidden sm:inline">{t("nav.search.buttonLabel")}</span>
          <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-2 font-mono text-xs font-medium">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
      </div>
    </div>
  );
}
