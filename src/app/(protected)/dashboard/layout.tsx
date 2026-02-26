import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AccountProvider } from "@/contexts/account-context";
import { WorkspaceProvider } from "@/contexts/team-context";

import { WorkspaceGuard } from "@/components/auth/team-guard";
import { CrmOverlays } from "@/components/crm/crm-overlays";
import { CallTimerProvider } from "@/contexts/call-timer-context";
import { CallTimerPopup } from "@/components/crm/call-timer-popup";
import { PostCallDialog } from "@/components/crm/post-call-dialog";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ErrorBoundary } from "@/components/error-boundary";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AccountProvider>
      <WorkspaceProvider>
        <CallTimerProvider>
        <SidebarProvider defaultOpen={true}>
          <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-background focus:text-foreground">Skip to content</a>
          <AppSidebar />
          <SidebarInset>
            <header className="flex h-14 shrink-0 items-center gap-2 border-b px-8">
              <DashboardHeader />
            </header>
            <WorkspaceGuard>
              <main id="main-content" className="flex-1 overflow-auto">
                <ErrorBoundary>
                  {children}
                </ErrorBoundary>
              </main>
            </WorkspaceGuard>
          </SidebarInset>
          <CrmOverlays />
          <CallTimerPopup />
          <PostCallDialog />
        </SidebarProvider>
        </CallTimerProvider>
      </WorkspaceProvider>
    </AccountProvider>
  );
}
