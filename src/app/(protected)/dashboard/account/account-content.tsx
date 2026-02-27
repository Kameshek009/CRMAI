"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Palette, Globe, Bell, Lock, CreditCard, Users, Shield, Link2, Download, Plug, AlertTriangle, DollarSign, Settings2, XCircle, Mail, ScrollText, History, Eye, FileInput, PanelLeft } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { ProfileSection } from "./sections/profile-section";
import { AppearanceSection } from "./sections/appearance-section";
import { LanguageSection } from "./sections/language-section";
import { NotificationsSection } from "./sections/notifications-section";
import { SecuritySection } from "./sections/security-section";
import { BillingSection } from "./sections/billing-section";
import { TeamSection } from "./sections/team-section";
import { MembersSection } from "./sections/members-section";
import { RolesSection } from "./sections/roles-section";
import { ConnectionsSection } from "./sections/connections-section";
import { ExportSection } from "./sections/export-section";
import { IntegrationsSection } from "./sections/integrations-section";
import { DangerSection } from "./sections/danger-section";
import { CurrenciesSection } from "./sections/currencies-section";
import { CustomFieldsSection } from "./sections/custom-fields-section";
import { LostReasonsSection } from "./sections/lost-reasons-section";
import { EmailTemplatesSection } from "./sections/email-templates-section";
import { AuditLogSection } from "./sections/audit-log-section";
import { LoginHistorySection } from "./sections/login-history-section";
import { DataAccessSection } from "./sections/data-access-section";
import { WebFormsSection } from "./sections/web-forms-section";
import { SidebarSection } from "./sections/sidebar-section";

interface AccountContentProps {
  email: string;
  name: string;
  imageUrl: string;
}

const PERSONAL_NAV = [
  { id: "profile", icon: User },
  { id: "appearance", icon: Palette },
  { id: "language", icon: Globe },
  { id: "notifications", icon: Bell },
  { id: "sidebar", icon: PanelLeft },
  { id: "security", icon: Lock },
  { id: "login-history", icon: History },
] as const;

const TEAM_NAV = [
  { id: "team", icon: Users },
  { id: "members", icon: Users },
  { id: "roles", icon: Shield },
  { id: "currencies", icon: DollarSign },
  { id: "custom-fields", icon: Settings2 },
  { id: "lost-reasons", icon: XCircle },
  { id: "email-templates", icon: Mail },
  { id: "connections", icon: Link2 },
  { id: "export", icon: Download },
  { id: "integrations", icon: Plug },
  { id: "audit-log", icon: ScrollText },
  { id: "data-access", icon: Eye },
  { id: "web-forms", icon: FileInput },
] as const;

const BILLING_NAV = [
  { id: "billing", icon: CreditCard },
] as const;

const VALID_TABS = [
  "profile", "appearance", "language", "notifications", "sidebar", "security", "login-history",
  "team", "members", "roles", "currencies", "custom-fields",
  "lost-reasons", "email-templates", "connections", "export", "integrations",
  "audit-log", "data-access", "web-forms", "billing", "danger",
];

export function AccountContent({ email, name, imageUrl }: AccountContentProps) {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(() =>
    tabParam && VALID_TABS.includes(tabParam) ? tabParam : "profile"
  );

  useEffect(() => {
    if (tabParam && VALID_TABS.includes(tabParam)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const renderNavItems = (
    items: ReadonlyArray<{ readonly id: string; readonly icon: typeof User }>,
  ) =>
    items.map(({ id, icon: Icon }) => (
      <TabsTrigger
        key={id}
        value={id}
        className="justify-start gap-2 px-3 py-1.5 text-sm"
      >
        <Icon className="size-4" />
        {t(`settings.nav.${id}`)}
      </TabsTrigger>
    ));

  return (
    <div className="flex flex-col min-h-full">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50 px-8 py-5">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-2xl font-bold tracking-tight">{t("settings.page.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("settings.page.description")}</p>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-8 py-6">
        <div className="mx-auto max-w-4xl">
          <Tabs value={activeTab} onValueChange={setActiveTab} orientation="vertical" className="md:flex md:gap-8">
            {/* Sidebar navigation — sticky, independently scrollable */}
            <TabsList
              variant="line"
              className="mb-6 flex overflow-x-auto md:mb-0 md:w-52 md:shrink-0 md:flex-col md:overflow-x-visible md:bg-transparent md:sticky md:top-24 md:self-start md:max-h-[calc(100vh-10rem)] md:overflow-y-auto"
            >
              {/* Personal */}
              <div className="px-2 pb-1 text-xs font-semibold text-muted-foreground/80 tracking-wide select-none">
                {t("settings.groups.personal")}
              </div>
              {renderNavItems(PERSONAL_NAV)}

              {/* Team */}
              <div className="mt-3 pt-3 border-t border-border/30 px-2 pb-1 text-xs font-semibold text-muted-foreground/80 tracking-wide select-none">
                {t("settings.groups.team")}
              </div>
              {renderNavItems(TEAM_NAV)}

              {/* Billing */}
              <div className="mt-3 pt-3 border-t border-border/30 px-2 pb-1 text-xs font-semibold text-muted-foreground/80 tracking-wide select-none">
                {t("settings.groups.billing")}
              </div>
              {renderNavItems(BILLING_NAV)}

              {/* Danger */}
              <div className="mt-3 pt-3 border-t border-border/30">
                <TabsTrigger
                  value="danger"
                  className="justify-start gap-2 px-3 py-1.5 text-sm text-destructive data-[state=active]:text-destructive"
                >
                  <AlertTriangle className="size-4" />
                  {t("settings.nav.danger")}
                </TabsTrigger>
              </div>
            </TabsList>

            {/* Content area */}
            <div className="flex-1 min-w-0">
            <TabsContent value="profile">
              <ProfileSection email={email} name={name} imageUrl={imageUrl} />
            </TabsContent>
            <TabsContent value="appearance">
              <AppearanceSection />
            </TabsContent>
            <TabsContent value="language">
              <LanguageSection />
            </TabsContent>
            <TabsContent value="notifications">
              <NotificationsSection />
            </TabsContent>
            <TabsContent value="sidebar">
              <SidebarSection />
            </TabsContent>
            <TabsContent value="security">
              <SecuritySection />
            </TabsContent>
            <TabsContent value="login-history">
              <LoginHistorySection />
            </TabsContent>
            <TabsContent value="team">
              <TeamSection />
            </TabsContent>
            <TabsContent value="members">
              <MembersSection />
            </TabsContent>
            <TabsContent value="roles">
              <RolesSection />
            </TabsContent>
            <TabsContent value="currencies">
              <CurrenciesSection />
            </TabsContent>
            <TabsContent value="custom-fields">
              <CustomFieldsSection />
            </TabsContent>
            <TabsContent value="lost-reasons">
              <LostReasonsSection />
            </TabsContent>
            <TabsContent value="email-templates">
              <EmailTemplatesSection />
            </TabsContent>
            <TabsContent value="connections">
              <ConnectionsSection />
            </TabsContent>
            <TabsContent value="export">
              <ExportSection />
            </TabsContent>
            <TabsContent value="integrations">
              <IntegrationsSection />
            </TabsContent>
            <TabsContent value="audit-log">
              <AuditLogSection />
            </TabsContent>
            <TabsContent value="data-access">
              <DataAccessSection />
            </TabsContent>
            <TabsContent value="web-forms">
              <WebFormsSection />
            </TabsContent>
            <TabsContent value="billing">
              <BillingSection />
            </TabsContent>
            <TabsContent value="danger">
              <DangerSection />
            </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
