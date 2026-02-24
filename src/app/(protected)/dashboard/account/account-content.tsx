"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { User, Palette, Globe, Bell, Lock, CreditCard, Users, Shield, Link2, Download, Plug, AlertTriangle, DollarSign, Settings2, XCircle, Mail, ScrollText, History, Eye, FileInput, PanelLeft, ChevronRight } from "lucide-react";
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

const PERSONAL_IDS = new Set<string>(PERSONAL_NAV.map((n) => n.id));
const TEAM_IDS = new Set<string>(TEAM_NAV.map((n) => n.id));
const BILLING_IDS = new Set<string>(BILLING_NAV.map((n) => n.id));

function getGroupForTab(tabId: string): string {
  if (PERSONAL_IDS.has(tabId)) return "personal";
  if (TEAM_IDS.has(tabId)) return "team";
  if (BILLING_IDS.has(tabId)) return "billing";
  return "personal";
}

export function AccountContent({ email, name, imageUrl }: AccountContentProps) {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(() =>
    tabParam && VALID_TABS.includes(tabParam) ? tabParam : "profile"
  );
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set([getGroupForTab(activeTab)]));

  useEffect(() => {
    if (tabParam && VALID_TABS.includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    const group = getGroupForTab(activeTab);
    setOpenGroups((prev) => {
      if (prev.has(group)) return prev;
      return new Set([...prev, group]);
    });
  }, [activeTab]);

  const toggleGroup = useCallback((group: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  }, []);

  const renderNavGroup = (
    groupId: string,
    labelKey: string,
    items: ReadonlyArray<{ readonly id: string; readonly icon: typeof User }>,
  ) => (
    <Collapsible open={openGroups.has(groupId)} onOpenChange={() => toggleGroup(groupId)}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
        <ChevronRight className={`size-3.5 transition-transform duration-200 ${openGroups.has(groupId) ? "rotate-90" : ""}`} />
        {t(labelKey)}
      </CollapsibleTrigger>
      <CollapsibleContent>
        {items.map(({ id, icon: Icon }) => (
          <TabsTrigger
            key={id}
            value={id}
            className="justify-start gap-2 px-3 py-1.5 text-sm"
          >
            <Icon className="size-4" />
            {t(`settings.nav.${id}`)}
          </TabsTrigger>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );

  return (
    <div className="p-8 min-h-full">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="space-y-2 mb-8">
          <h1 className="text-2xl font-bold tracking-tight">{t("settings.page.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("settings.page.description")}</p>
        </div>

        {/* Tabs layout */}
        <Tabs value={activeTab} onValueChange={setActiveTab} orientation="vertical" className="md:flex md:gap-8">
          {/* Sidebar navigation */}
          <TabsList
            variant="line"
            className="mb-6 flex overflow-x-auto md:mb-0 md:w-52 md:shrink-0 md:flex-col md:overflow-x-visible md:bg-transparent"
          >
            {renderNavGroup("personal", "settings.groups.personal", PERSONAL_NAV)}
            {renderNavGroup("team", "settings.groups.team", TEAM_NAV)}
            {renderNavGroup("billing", "settings.groups.billing", BILLING_NAV)}

            {/* Danger — always visible, no group */}
            <TabsTrigger
              value="danger"
              className="justify-start gap-2 px-3 py-1.5 text-sm text-destructive data-[state=active]:text-destructive mt-1"
            >
              <AlertTriangle className="size-4" />
              {t("settings.nav.danger")}
            </TabsTrigger>
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
  );
}
