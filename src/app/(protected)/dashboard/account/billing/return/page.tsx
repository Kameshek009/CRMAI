"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageContainer, Card } from "@/components/dashboard/page-container";
import { Check, X, Loader2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

type ReturnStatus = "loading" | "success" | "failed" | "error";

function ReturnContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [status, setStatus] = useState<ReturnStatus>("loading");

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      return;
    }

    async function verifySession() {
      try {
        const response = await fetch(
          `/api/billing/checkout/verify?session_id=${sessionId}`
        );
        const data = await response.json();

        if (data.success) {
          if (data.data.status === "complete") {
            setStatus("success");
          } else if (data.data.status === "open") {
            setTimeout(verifySession, 2000);
          } else {
            setStatus("failed");
          }
        } else {
          setStatus("error");
        }
      } catch {
        setStatus("error");
      }
    }

    verifySession();
  }, [sessionId]);

  useEffect(() => {
    if (status === "success") {
      const timer = setTimeout(() => {
        router.push("/dashboard/account/billing");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status, router]);

  return (
    <PageContainer>
      <Card>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          {status === "loading" && (
            <>
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-4">
                {t("billing.return.confirmingPayment")}
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center mb-4">
                <Check className="w-6 h-6 text-foreground" />
              </div>
              <p className="text-sm text-foreground">{t("billing.return.paymentComplete")}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {t("billing.return.redirecting")}
              </p>
            </>
          )}

          {status === "failed" && (
            <>
              <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center mb-4">
                <X className="w-6 h-6 text-foreground" />
              </div>
              <p className="text-sm text-foreground">{t("billing.return.paymentNotCompleted")}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("billing.return.pleaseTryAgain")}
              </p>
              <button
                onClick={() => router.push("/dashboard/account/billing")}
                className="mt-4 px-4 py-2 text-sm rounded-full border border-border hover:bg-secondary transition-colors cursor-pointer"
              >
                {t("billing.return.backToBilling")}
              </button>
            </>
          )}

          {status === "error" && (
            <>
              <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center mb-4">
                <X className="w-6 h-6 text-foreground" />
              </div>
              <p className="text-sm text-foreground">{t("billing.return.somethingWentWrong")}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("billing.return.tryAgainOrContact")}
              </p>
              <button
                onClick={() => router.push("/dashboard/account/billing")}
                className="mt-4 px-4 py-2 text-sm rounded-full border border-border hover:bg-secondary transition-colors cursor-pointer"
              >
                {t("billing.return.backToBilling")}
              </button>
            </>
          )}
        </div>
      </Card>
    </PageContainer>
  );
}

export default function CheckoutReturnPage() {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <Card>
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          </Card>
        </PageContainer>
      }
    >
      <ReturnContent />
    </Suspense>
  );
}
