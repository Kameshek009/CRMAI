"use client";

import { Separator } from "@/components/ui/separator";
import { ThemeToggleSlider } from "@/components/theme-toggle-slider";
import { useTranslation } from "@/lib/i18n";

export function AppearanceSection() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t("settings.appearance.title")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t("settings.appearance.description")}</p>
      </div>
      <Separator />
      <div className="flex items-center justify-between max-w-md">
        <div>
          <p className="font-medium text-sm">{t("settings.appearance.theme")}</p>
          <p className="text-sm text-muted-foreground">
            {t("settings.appearance.themeDescription")}
          </p>
        </div>
        <ThemeToggleSlider />
      </div>
    </div>
  );
}
