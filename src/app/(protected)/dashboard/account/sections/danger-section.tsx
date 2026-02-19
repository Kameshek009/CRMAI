"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "@/lib/i18n";

export function DangerSection() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-destructive">{t("settings.danger.title")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t("settings.danger.description")}</p>
      </div>
      <Separator />
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-sm">{t("settings.danger.deleteAccount")}</p>
          <p className="text-sm text-muted-foreground">
            {t("settings.danger.deleteDescription")}
          </p>
        </div>
        <Button variant="destructive">{t("settings.danger.deleteAccount")}</Button>
      </div>
    </div>
  );
}
