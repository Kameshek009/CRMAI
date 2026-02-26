"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";

import { useWorkspace } from "@/contexts/team-context";
import { useTranslation } from "@/lib/i18n";
import { Logo } from "@/components/ui/logo";
import { NexusBrandSidebar } from "@/components/nexus-brand";
import { TeamSwitcher } from "@/components/team/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  LayoutGrid,
  Settings,
  BarChart3,
  CreditCard,
  LogOut,
  ChevronsUpDown,
  MessageSquare,
  Users,
  Building2,
  Kanban,
  CheckSquare,
  TrendingUp,
  Sparkles,
  Zap,
  Handshake,
  FileText,
  Phone,
  Mail,
  Trash2,
  GitMerge,
  Target,
  LineChart,
  UserPlus,
  Pencil,
  CalendarDays,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebarConfigStore, getEffectiveItems } from "@/stores/sidebar-config-store";
import { SidebarGroupEditor } from "@/components/sidebar/sidebar-group-editor";

export interface NavItem {
  key: string;
  labelKey: string;
  href: string;
  icon: LucideIcon;
  permission?: string;
}

interface NavGroup {
  labelKey?: string;
  groupKey?: "crm" | "tools";
  items: NavItem[];
}

export const crmGroup: NavGroup = {
  labelKey: "nav.groups.crm",
  groupKey: "crm",
  items: [
    { key: "contacts", labelKey: "nav.items.contacts", href: "/dashboard/contacts", icon: Users, permission: "contacts.read" },
    { key: "deals", labelKey: "nav.items.deals", href: "/dashboard/deals", icon: Handshake, permission: "deals.read" },
    { key: "organizations", labelKey: "nav.items.organizations", href: "/dashboard/companies", icon: Building2, permission: "companies.read" },
    { key: "tasks", labelKey: "nav.items.tasks", href: "/dashboard/tasks", icon: CheckSquare, permission: "tasks.read" },
    { key: "notes", labelKey: "nav.items.notes", href: "/dashboard/notes", icon: FileText, permission: "notes.read" },
    { key: "call-logs", labelKey: "nav.items.callLogs", href: "/dashboard/call-logs", icon: Phone, permission: "call_logs.read" },
    { key: "leads", labelKey: "nav.items.leads", href: "/dashboard/leads", icon: UserPlus, permission: "leads.read" },
    { key: "showings", labelKey: "nav.items.showings", href: "/dashboard/showings", icon: CalendarDays, permission: "deals.read" },
  ],
};

export const toolsGroup: NavGroup = {
  labelKey: "nav.groups.tools",
  groupKey: "tools",
  items: [
    { key: "pipeline", labelKey: "nav.items.pipeline", href: "/dashboard/pipeline", icon: Kanban, permission: "pipeline.read" },
    { key: "automations", labelKey: "nav.items.automations", href: "/dashboard/automations", icon: Zap },
    { key: "sequences", labelKey: "nav.items.sequences", href: "/dashboard/sequences", icon: Mail },
    { key: "analytics", labelKey: "nav.items.analytics", href: "/dashboard/analytics", icon: TrendingUp, permission: "analytics.read" },
    { key: "chats", labelKey: "nav.items.aiChat", href: "/dashboard/chats", icon: MessageSquare, permission: "ai_chat.allowed" },
    { key: "dedup", labelKey: "nav.items.dedup", href: "/dashboard/dedup", icon: GitMerge },
    { key: "goals", labelKey: "nav.items.goals", href: "/dashboard/goals", icon: Target },
    { key: "forecast", labelKey: "nav.items.forecast", href: "/dashboard/forecast", icon: LineChart },
  ],
};

const accountGroup: NavGroup = {
  items: [
    { key: "trash", labelKey: "nav.items.trash", href: "/dashboard/trash", icon: Trash2 },
    { key: "settings", labelKey: "nav.items.settings", href: "/dashboard/account", icon: Settings },
    { key: "usage", labelKey: "nav.items.usage", href: "/dashboard/usage", icon: BarChart3 },
    { key: "upgrade", labelKey: "nav.items.upgrade", href: "/dashboard/upgrade", icon: Sparkles },
    { key: "billing", labelKey: "nav.items.billing", href: "/dashboard/account/billing", icon: CreditCard },
  ],
};

const TIER_COLORS: Record<string, string> = {
  free: "bg-muted text-muted-foreground",
  pro: "bg-gradient-to-r from-blue-500/10 to-cyan-500/10 text-blue-600 border-blue-200/50 dark:border-blue-800/30",
  max: "bg-gradient-to-r from-landing-accent/10 to-landing-accent/10 text-landing-accent border-landing-accent/20 dark:border-landing-accent/20",
  enterprise: "bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-600 border-amber-200/50 dark:border-amber-800/30",
};

function NavUser() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { currentWorkspace } = useWorkspace();
  const { isMobile } = useSidebar();
  const { t } = useTranslation();

  if (!user) return null;

  const wsTier = currentWorkspace?.tier || "free";
  const tierName = t(`nav.tier.${wsTier}`);
  const tierColor = TIER_COLORS[wsTier] || TIER_COLORS.free;
  const displayName = user.firstName || user.primaryEmailAddress?.emailAddress?.split("@")[0] || "User";
  const email = user.primaryEmailAddress?.emailAddress || "";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group/user"
            >
              <Avatar className="h-8 w-8 rounded-lg ring-2 ring-transparent group-hover/user:ring-primary/10 transition-all">
                <AvatarImage src={user.imageUrl} alt={displayName} />
                <AvatarFallback className="rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{displayName}</span>
                <span className="truncate text-xs text-muted-foreground">{email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-xl"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <div className="flex items-center gap-2 p-2">
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.imageUrl} alt={displayName} />
                <AvatarFallback className="rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{displayName}</span>
                <span className="truncate text-xs text-muted-foreground">{email}</span>
              </div>
              <Badge variant="outline" className={cn("ml-2 text-[10px] border", tierColor)}>
                {tierName}
              </Badge>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/account" className="flex items-center gap-2">
                <Settings className="size-4" />
                {t("nav.user.settings")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/account/billing" className="flex items-center gap-2">
                <CreditCard className="size-4" />
                {t("nav.user.billing")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ redirectUrl: "/sign-in" })}
              className="text-red-600 focus:text-red-600 focus:bg-red-500/10"
            >
              <LogOut className="size-4" />
              {t("nav.user.signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { can } = useWorkspace();
  const { t } = useTranslation();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { config, fetch: fetchConfig, update: updateConfig } = useSidebarConfigStore();
  const [editingGroup, setEditingGroup] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Get effective items for customizable groups
  const effectiveCrmItems = getEffectiveItems("crm", crmGroup.items, config);
  const effectiveToolsItems = getEffectiveItems("tools", toolsGroup.items, config);

  const handleSaveGroup = useCallback(
    (groupKey: string, items: { key: string; visible: boolean }[]) => {
      const otherGroupKey = groupKey === "crm" ? "tools" : "crm";
      const otherStaticItems = groupKey === "crm" ? toolsGroup.items : crmGroup.items;
      const otherEffective = getEffectiveItems(otherGroupKey, otherStaticItems, config);

      const newConfig = [
        {
          groupKey: groupKey as "crm" | "tools",
          items: items.map((i) => ({ key: i.key, visible: i.visible })),
        },
        {
          groupKey: otherGroupKey as "crm" | "tools",
          items: otherEffective.map((i) => ({ key: i.key, visible: i.visible })),
        },
      ].sort((a, b) => (a.groupKey === "crm" ? -1 : 1));

      updateConfig(newConfig);
    },
    [config, updateConfig]
  );

  // Build the customizable groups
  const customizableGroups: { group: NavGroup; effectiveItems: (NavItem & { visible: boolean })[] }[] = [
    { group: crmGroup, effectiveItems: effectiveCrmItems },
    { group: toolsGroup, effectiveItems: effectiveToolsItems },
  ];

  return (
    <Sidebar collapsible="icon">
      {/* Logo Header */}
      <SidebarHeader className="relative">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard" className="group/logo">
                <div className="flex aspect-square size-8 items-center justify-center rounded-xl bg-gradient-to-br from-landing-accent/15 to-landing-accent/15 dark:from-landing-accent/20 dark:to-landing-accent/20 transition-all duration-300 group-hover/logo:from-landing-accent/25 group-hover/logo:to-landing-accent/25 group-hover/logo:shadow-md group-hover/logo:shadow-landing-accent/10">
                  <Logo size={20} />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <NexusBrandSidebar />
                  <span className="truncate text-xs text-muted-foreground">{t("nav.dashboard")}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Team Switcher */}
        <TeamSwitcher />
      </SidebarHeader>

      {/* Navigation Content */}
      <SidebarContent>
        {/* Overview group (not customizable) */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/dashboard"} tooltip={t("nav.overview")}>
                  <Link href="/dashboard">
                    <LayoutGrid className={cn(pathname === "/dashboard" && "text-[var(--accent-blue)]")} />
                    <span className={cn(pathname === "/dashboard" && "font-semibold")}>{t("nav.overview")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
          <SidebarSeparator className="my-2 opacity-30" />
        </SidebarGroup>

        {/* CRM and Tools groups (customizable) */}
        {customizableGroups.map(({ group, effectiveItems }) => (
          <SidebarGroup key={group.groupKey} aria-label={group.labelKey ? t(group.labelKey) : undefined}>
            {group.labelKey && (
              <SidebarGroupLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80 group/label">
                <span>{t(group.labelKey)}</span>
                {!isCollapsed && (
                  <button
                    onClick={() => setEditingGroup(editingGroup === group.groupKey ? null : group.groupKey!)}
                    className="ml-auto opacity-0 group-hover/label:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted"
                    aria-label={`Edit ${t(group.labelKey!)} section`}
                  >
                    <Pencil className="size-3 text-muted-foreground" />
                  </button>
                )}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              {editingGroup === group.groupKey ? (
                <SidebarGroupEditor
                  groupKey={group.groupKey!}
                  items={effectiveItems}
                  staticItems={group.items}
                  onSave={(items) => handleSaveGroup(group.groupKey!, items)}
                  onClose={() => setEditingGroup(null)}
                />
              ) : (
                <SidebarMenu>
                  {effectiveItems
                    .filter((item) => item.visible)
                    .filter((item) => !item.permission || can(item.permission))
                    .map((item) => {
                      const Icon = item.icon;
                      const label = t(item.labelKey);
                      const isActive = pathname === item.href ||
                        (item.href !== "/dashboard" && pathname.startsWith(item.href));

                      return (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton asChild isActive={isActive} tooltip={label}>
                            <Link href={item.href}>
                              <Icon className={cn(isActive && "text-[var(--accent-blue)]")} />
                              <span className={cn(isActive && "font-semibold")}>{label}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                </SidebarMenu>
              )}
            </SidebarGroupContent>
            <SidebarSeparator className="my-2 opacity-30" />
          </SidebarGroup>
        ))}

        {/* Account group (not customizable) */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountGroup.items.map((item) => {
                const Icon = item.icon;
                const label = t(item.labelKey);
                const isActive = pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={label}>
                      <Link href={item.href}>
                        <Icon className={cn(isActive && "text-[var(--accent-blue)]")} />
                        <span className={cn(isActive && "font-semibold")}>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* User Footer */}
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
