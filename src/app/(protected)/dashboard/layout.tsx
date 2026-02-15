import { cookies } from "next/headers";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AccountProvider } from "@/contexts/account-context";
import { TeamProvider } from "@/contexts/team-context";
import { TeamGuard } from "@/components/auth/team-guard";
import { CrmOverlays } from "@/components/crm/crm-overlays";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <AccountProvider>
      <TeamProvider>
        <SidebarProvider defaultOpen={defaultOpen}>
          <AppSidebar />
          <SidebarInset>
            <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <DashboardHeader />
            </header>
            <TeamGuard>
              <main className="flex-1 overflow-auto">
                {children}
              </main>
            </TeamGuard>
          </SidebarInset>
          <CrmOverlays />
        </SidebarProvider>
      </TeamProvider>
    </AccountProvider>
  );
}
