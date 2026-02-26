"use client";

import { useOnlineStatus } from "@/hooks/use-online-status";
import { useTranslation } from "@/lib/i18n";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const { t } = useTranslation();

  if (isOnline) return null;

  return (
    <div
      role="alert"
      className="flex items-center gap-2 bg-destructive/10 text-destructive px-4 py-2 text-sm border-b border-destructive/20"
    >
      <WifiOff className="size-4 shrink-0" />
      <span className="font-medium">{t("common.offline")}</span>
      <span className="text-destructive/70">{t("common.offlineDescription")}</span>
    </div>
  );
}
