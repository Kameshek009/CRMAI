"use client";

import { useTeam } from "@/contexts/team-context";
import { Check, ChevronsUpDown, Plus, Users } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export function TeamSwitcher() {
  const { currentTeam, teams, myRole, switchTeam } = useTeam();
  const { isMobile } = useSidebar();

  if (!currentTeam) return null;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Users className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{currentTeam.name}</span>
                {myRole && (
                  <span className="truncate text-xs text-muted-foreground">
                    {myRole.name}
                  </span>
                )}
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="start"
            sideOffset={4}
          >
            {teams.map((membership) => (
              <DropdownMenuItem
                key={membership.team.id}
                onClick={() => switchTeam(membership.team.id)}
                className="gap-2"
              >
                <div className="flex aspect-square size-6 items-center justify-center rounded bg-primary/10 text-primary">
                  <Users className="size-3" />
                </div>
                <div className="flex-1 truncate">
                  <span className="text-sm">{membership.team.name}</span>
                </div>
                {membership.isDirector && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                    Director
                  </Badge>
                )}
                {membership.team.id === currentTeam.id && (
                  <Check className="size-4 text-primary" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/join-team" className="gap-2">
                <Plus className="size-4" />
                Create or Join Team
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
