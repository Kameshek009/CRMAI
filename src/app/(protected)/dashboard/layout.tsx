import { cookies } from "next/headers";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AccountProvider } from "@/contexts/account-context";
import { WorkspaceProvider } from "@/contexts/team-context";
import { LanguageProvider } from "@/lib/i18n";
import { WorkspaceGuard } from "@/components/auth/team-guard";
import { CrmOverlays } from "@/components/crm/crm-overlays";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ErrorBoundary } from "@/components/error-boundary";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";

  return (
    <AccountProvider>
      <LanguageProvider>
      <WorkspaceProvider>
        <SidebarProvider defaultOpen={defaultOpen}>
          <AppSidebar />
          <SidebarInset>
            <header className="flex h-14 shrink-0 items-center gap-2 border-b px-8">
              <DashboardHeader />
            </header>
            <WorkspaceGuard>
              <main className="flex-1 overflow-auto">
                <ErrorBoundary>
                  {children}
                </ErrorBoundary>
              </main>
            </WorkspaceGuard>
          </SidebarInset>
          <CrmOverlays />
        </SidebarProvider>
      </WorkspaceProvider>
      </LanguageProvider>
    </AccountProvider>
  );
}
