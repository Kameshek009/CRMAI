"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n";

export default function DashboardNotFound() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-md">
        <h1 className="text-4xl font-bold">404</h1>
        <h2 className="text-lg font-semibold">{t("common.pageNotFound")}</h2>
        <p className="text-muted-foreground">
          {t("common.dashboardPageNotExist")}
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {t("common.backToDashboard")}
        </Link>
      </div>
    </div>
  );
}
