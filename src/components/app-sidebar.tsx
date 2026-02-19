"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";

import { useWorkspace } from "@/contexts/team-context";
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
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";


interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  permission?: string;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

const crmGroup: NavGroup = {
  label: "CRM",
  items: [
    { label: "Leads", href: "/dashboard/leads", icon: Zap, permission: "leads.read" },
    { label: "Contacts", href: "/dashboard/contacts", icon: Users, permission: "contacts.read" },
    { label: "Deals", href: "/dashboard/deals", icon: Handshake, permission: "deals.read" },
    { label: "Organizations", href: "/dashboard/companies", icon: Building2, permission: "companies.read" },
    { label: "Tasks", href: "/dashboard/tasks", icon: CheckSquare, permission: "tasks.read" },
    { label: "Notes", href: "/dashboard/notes", icon: FileText, permission: "notes.read" },
    { label: "Call Logs", href: "/dashboard/call-logs", icon: Phone, permission: "call_logs.read" },
  ],
};

const toolsGroup: NavGroup = {
  label: "Tools",
  items: [
    { label: "Pipeline", href: "/dashboard/pipeline", icon: Kanban, permission: "pipeline.read" },
    { label: "Automations", href: "/dashboard/automations", icon: Zap },
    { label: "Sequences", href: "/dashboard/sequences", icon: Mail },
    { label: "Analytics", href: "/dashboard/analytics", icon: TrendingUp, permission: "analytics.read" },
    { label: "AI Chat", href: "/dashboard/chats", icon: MessageSquare, permission: "ai_chat.allowed" },
  ],
};

const workspaceGroup: NavGroup = {
  label: "Workspace",
  items: [
    { label: "Workspace", href: "/dashboard/team", icon: Users },
    { label: "Settings", href: "/dashboard/team/settings", icon: Settings, permission: "team_settings.manage" },
  ],
};

const accountGroup: NavGroup = {
  items: [
    { label: "Account", href: "/dashboard/account", icon: Settings },
    { label: "Usage", href: "/dashboard/usage", icon: BarChart3 },
    { label: "Upgrade", href: "/dashboard/upgrade", icon: Sparkles },
    { label: "Billing", href: "/dashboard/account/billing", icon: CreditCard },
  ],
};

const navGroups: NavGroup[] = [
  { items: [{ label: "Overview", href: "/dashboard", icon: LayoutGrid }] },
  crmGroup,
  toolsGroup,
  workspaceGroup,
  accountGroup,
];

const TIER_DISPLAY_NAMES: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  max: "Max",
  enterprise: "Enterprise",
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

  if (!user) return null;

  const wsTier = currentWorkspace?.tier || "free";
  const tierName = TIER_DISPLAY_NAMES[wsTier] || "Free";
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
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/account/billing" className="flex items-center gap-2">
                <CreditCard className="size-4" />
                Billing
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ redirectUrl: "/sign-in" })}
              className="text-red-600 focus:text-red-600 focus:bg-red-500/10"
            >
              <LogOut className="size-4" />
              Sign out
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
                  <span className="truncate text-xs text-muted-foreground">Dashboard</span>
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
        {navGroups.map((group, groupIndex) => (
          <SidebarGroup key={groupIndex}>
            {group.label && (
              <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items
                  .filter((item) => !item.permission || can(item.permission))
                  .map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href ||
                      (item.href !== "/dashboard" && pathname.startsWith(item.href));

                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                          <Link href={item.href}>
                            <Icon className={cn(isActive && "text-[var(--accent-blue)]")} />
                            <span className={cn(isActive && "font-semibold")}>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
              </SidebarMenu>
            </SidebarGroupContent>
            {groupIndex < navGroups.length - 1 && <SidebarSeparator className="my-2 opacity-30" />}
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* User Footer */}
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
