"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { useWorkspace } from "@/contexts/team-context";
import { useTranslation } from "@/lib/i18n";
import {
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
  labelKey: string;
  href: string;
  icon: LucideIcon;
  external?: boolean;
}

interface NavGroup {
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    items: [
      { labelKey: "crm.sidebar.settings", href: "/dashboard/account", icon: Settings },
    ],
  },
  {
    items: [
      { labelKey: "crm.sidebar.usage", href: "/dashboard/usage", icon: BarChart3 },
      { labelKey: "crm.sidebar.billing", href: "/dashboard/account/billing", icon: CreditCard },
    ],
  },
  {
    items: [
      { labelKey: "crm.sidebar.docs", href: "https://docs.nexxuscrm.com", icon: FileText, external: true },
      { labelKey: "crm.sidebar.contactUs", href: "mailto:support@nexxuscrm.com", icon: Mail, external: true },
    ],
  },
];

const TIER_KEY_MAP: Record<string, string> = {
  free: "billing.plans.free",
  pro: "billing.plans.pro",
  max: "billing.plans.max",
  enterprise: "billing.plans.enterprise",
};

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { currentWorkspace: currentTeam } = useWorkspace();
  const { t } = useTranslation();

  const tierName = currentTeam?.tier ? t(TIER_KEY_MAP[currentTeam.tier] || "billing.plans.free") : t("billing.plans.free");

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 flex flex-col bg-background border-r border-border z-50">
      {/* Logo */}
      <div className="h-14 flex items-center px-6">
        <Link href="/dashboard">
          <Logo size={22} />
        </Link>
      </div>

      {/* User Info */}
      {user && (
        <div className="px-6 pb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {user.firstName || user.primaryEmailAddress?.emailAddress?.split("@")[0]}
            </span>
            <ExternalLink className="w-3 h-3 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {tierName} {t("crm.sidebar.plan")} · {user.primaryEmailAddress?.emailAddress}
          </p>
        </div>
      )}

      {/* Navigation Groups */}
      <nav className="flex-1 px-4 overflow-y-auto" aria-label="Settings navigation">
        {navGroups.map((group, groupIndex) => (
          <div key={groupIndex}>
            {groupIndex > 0 && (
              <div className="h-px bg-border mx-2 my-2" />
            )}

            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isExternal = item.external === true;
                const isActive = !isExternal && pathname === item.href;
                const label = t(item.labelKey);

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
                      <span>{label}</span>
                    </a>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-4 h-10 px-4 rounded-lg text-sm transition-colors",
                      isActive
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    )}
                  >
                    <Icon className="w-4 h-4" strokeWidth={1.5} />
                    <span>{label}</span>
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
          <span>{t("crm.sidebar.signOut")}</span>
        </button>
      </div>
    </aside>
  );
}
