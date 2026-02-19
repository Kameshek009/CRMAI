"use client";

import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation, languages } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";

export function LanguageSection() {
  const { locale, setLocale, t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t("settings.language.title")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t("settings.language.description")}</p>
      </div>
      <Separator />
      <div className="flex items-center justify-between max-w-md">
        <div>
          <p className="font-medium text-sm">{t("settings.language.displayLanguage")}</p>
          <p className="text-sm text-muted-foreground">
            {t("settings.language.displayLanguageDescription")}
          </p>
        </div>
        <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {languages.map((lang) => (
              <SelectItem key={lang.code} value={lang.code}>
                {lang.nativeName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
