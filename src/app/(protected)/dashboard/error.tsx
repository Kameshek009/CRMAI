"use client";

import { useEffect } from "react";
import { useTranslation } from "@/lib/i18n";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-md">
        <h1 className="text-2xl font-bold">{t("common.somethingWentWrong")}</h1>
        <p className="text-muted-foreground">
          {t("common.errorLoadingPage")}
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {t("common.tryAgain")}
        </button>
      </div>
    </div>
  );
}
