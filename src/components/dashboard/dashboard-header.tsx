"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSearchStore } from "@/stores/search-store";

const segmentLabels: Record<string, string> = {
  dashboard: "Home",
  contacts: "Contacts",
  companies: "Organizations",
  pipeline: "Pipeline",
  tasks: "Tasks",
  chats: "AI Chat",
  analytics: "Analytics",
  team: "Team",
  account: "Account",
  usage: "Usage",
  upgrade: "Upgrade",
  activity: "Activity",
  sessions: "Sessions",
  console: "Console",
  billing: "Billing",
  members: "Members",
  roles: "Roles",
  settings: "Settings",
  connections: "Connections",
  deals: "Deals",
  leads: "Leads",
  "call-logs": "Call Logs",
  notes: "Notes",
  automations: "Automations",
  sequences: "Sequences",
};

function isUUID(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

export function DashboardHeader() {
  const pathname = usePathname();
  const setOpen = useSearchStore((s) => s.setOpen);

  const segments = pathname.split("/").filter(Boolean);
  // Build breadcrumb items
  const crumbs: { label: string; href: string }[] = [];
  let path = "";
  for (const seg of segments) {
    path += `/${seg}`;
    const label = isUUID(seg) ? "Detail" : segmentLabels[seg] || seg;
    crumbs.push({ label, href: path });
  }

  return (
    <div className="flex items-center justify-between flex-1">
      <nav className="flex items-center gap-1 text-sm">
        {crumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronRight className="size-3.5 text-muted-foreground" />
            )}
            {i === crumbs.length - 1 ? (
              <span className="font-medium text-foreground">{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </nav>

      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Search className="size-3.5" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-2 font-mono text-xs font-medium">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
    </div>
  );
}
