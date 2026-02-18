"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { useTeam } from "@/contexts/team-context";
import {
  LayoutGrid,
  Settings,
  BarChart3,
  CreditCard,
  FileText,
  Mail,
  LogOut,
  ExternalLink,
  LucideIcon,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  external?: boolean;
}

interface NavGroup {
  items: NavItem[];
}

// Navigation groups matching Cursor's structure
const navGroups: NavGroup[] = [
  {
    items: [
      { label: "Overview", href: "/dashboard", icon: LayoutGrid },
      { label: "Settings", href: "/dashboard/account", icon: Settings },
    ],
  },
  {
    items: [
      { label: "Usage", href: "/dashboard/usage", icon: BarChart3 },
      { label: "Billing & Invoices", href: "/dashboard/account/billing", icon: CreditCard },
    ],
  },
  {
    items: [
      { label: "Docs", href: "https://docs.nexxuscrm.com", icon: FileText, external: true },
      { label: "Contact Us", href: "mailto:support@nexxuscrm.com", icon: Mail, external: true },
    ],
  },
];

// Display names for tiers
const TIER_DISPLAY_NAMES: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  max: "Max",
  enterprise: "Enterprise",
};

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { currentTeam } = useTeam();

  const tierName = currentTeam?.tier ? TIER_DISPLAY_NAMES[currentTeam.tier] || "Free" : "Free";

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 flex flex-col bg-background border-r border-border z-50">
      {/* Logo */}
      <div className="h-14 flex items-center px-6">
        <Link href="/dashboard">
          <Logo size={22} />
        </Link>
      </div>

      {/* User Info - At Top like Cursor */}
      {user && (
        <div className="px-6 pb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {user.firstName || user.primaryEmailAddress?.emailAddress?.split("@")[0]}
            </span>
            <ExternalLink className="w-3 h-3 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {tierName} Plan · {user.primaryEmailAddress?.emailAddress}
          </p>
        </div>
      )}

      {/* Navigation Groups */}
      <nav className="flex-1 px-4 overflow-y-auto">
        {navGroups.map((group, groupIndex) => (
          <div key={groupIndex}>
            {/* Divider before each group (except first) */}
            {groupIndex > 0 && (
              <div className="h-px bg-border mx-2 my-2" />
            )}

            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isExternal = item.external === true;
                const isActive = !isExternal && pathname === item.href;

                if (isExternal) {
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 h-10 px-4 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    >
                      <Icon className="w-4 h-4" strokeWidth={1.5} />
                      <span>{item.label}</span>
                    </a>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-4 h-10 px-4 rounded-lg text-sm transition-colors",
                      isActive
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    )}
                  >
                    <Icon className="w-4 h-4" strokeWidth={1.5} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Sign Out */}
      <div className="px-4 py-4">
        <div className="h-px bg-border mx-2 mb-2" />
        <button
          onClick={() => signOut({ redirectUrl: "/sign-in" })}
          className="flex items-center gap-4 h-10 px-4 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors w-full"
        >
          <LogOut className="w-4 h-4" strokeWidth={1.5} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
