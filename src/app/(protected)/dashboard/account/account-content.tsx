"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { User, Palette, Globe, Bell, Lock, CreditCard, Users, Shield, Link2, Download, Plug, AlertTriangle } from "lucide-react";
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
  { id: "security", icon: Lock },
] as const;

const TEAM_NAV = [
  { id: "team", icon: Users },
  { id: "members", icon: Users },
  { id: "roles", icon: Shield },
  { id: "connections", icon: Link2 },
  { id: "export", icon: Download },
  { id: "integrations", icon: Plug },
] as const;

const BILLING_NAV = [
  { id: "billing", icon: CreditCard },
] as const;

const VALID_TABS = [
  "profile", "appearance", "language", "notifications", "security",
  "team", "members", "roles", "connections", "export", "integrations",
  "billing", "danger",
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
      setActiveTab(tabParam);
    }
  }, [tabParam]);

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
            {/* Personal */}
            {PERSONAL_NAV.map(({ id, icon: Icon }) => (
              <TabsTrigger
                key={id}
                value={id}
                className="justify-start gap-2 px-3 py-2 text-sm"
              >
                <Icon className="size-4" />
                {t(`settings.nav.${id}`)}
              </TabsTrigger>
            ))}

            <Separator className="my-2 hidden md:block" />

            {/* Team */}
            {TEAM_NAV.map(({ id, icon: Icon }) => (
              <TabsTrigger
                key={id}
                value={id}
                className="justify-start gap-2 px-3 py-2 text-sm"
              >
                <Icon className="size-4" />
                {t(`settings.nav.${id}`)}
              </TabsTrigger>
            ))}

            <Separator className="my-2 hidden md:block" />

            {/* Billing */}
            {BILLING_NAV.map(({ id, icon: Icon }) => (
              <TabsTrigger
                key={id}
                value={id}
                className="justify-start gap-2 px-3 py-2 text-sm"
              >
                <Icon className="size-4" />
                {t(`settings.nav.${id}`)}
              </TabsTrigger>
            ))}

            <Separator className="my-2 hidden md:block" />

            {/* Danger */}
            <TabsTrigger
              value="danger"
              className="justify-start gap-2 px-3 py-2 text-sm text-destructive data-[state=active]:text-destructive"
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
            <TabsContent value="security">
              <SecuritySection />
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
            <TabsContent value="connections">
              <ConnectionsSection />
            </TabsContent>
            <TabsContent value="export">
              <ExportSection />
            </TabsContent>
            <TabsContent value="integrations">
              <IntegrationsSection />
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
