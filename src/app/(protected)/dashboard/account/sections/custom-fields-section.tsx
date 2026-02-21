"use client";

import { useTranslation } from "@/lib/i18n";
import { Separator } from "@/components/ui/separator";
import { FieldManager } from "@/components/crm/field-manager";

export function CustomFieldsSection() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t("settings.customFields.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("settings.customFields.description")}</p>
      </div>
      <Separator />
      <FieldManager />
    </div>
  );
}
