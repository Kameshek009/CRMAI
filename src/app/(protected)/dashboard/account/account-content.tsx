"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { User, Palette, Globe, CreditCard, Users, AlertTriangle } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { ProfileSection } from "./sections/profile-section";
import { AppearanceSection } from "./sections/appearance-section";
import { LanguageSection } from "./sections/language-section";
import { BillingSection } from "./sections/billing-section";
import { WorkspaceSection } from "./sections/workspace-section";
import { DangerSection } from "./sections/danger-section";

interface AccountContentProps {
  email: string;
  name: string;
  imageUrl: string;
}

const NAV_ITEMS = [
  { id: "profile", icon: User },
  { id: "appearance", icon: Palette },
  { id: "language", icon: Globe },
  { id: "billing", icon: CreditCard },
  { id: "workspace", icon: Users },
] as const;

export function AccountContent({ email, name, imageUrl }: AccountContentProps) {
  const { t } = useTranslation();

  return (
    <div className="p-8 min-h-full">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="space-y-2 mb-8">
          <h1 className="text-2xl font-bold tracking-tight">{t("settings.page.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("settings.page.description")}</p>
        </div>

        {/* Tabs layout */}
        <Tabs defaultValue="profile" orientation="vertical" className="md:flex md:gap-8">
          {/* Sidebar navigation */}
          <TabsList
            variant="line"
            className="mb-6 flex overflow-x-auto md:mb-0 md:w-52 md:shrink-0 md:flex-col md:overflow-x-visible md:bg-transparent"
          >
            {NAV_ITEMS.map(({ id, icon: Icon }) => (
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
            <TabsContent value="billing">
              <BillingSection />
            </TabsContent>
            <TabsContent value="workspace">
              <WorkspaceSection />
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
