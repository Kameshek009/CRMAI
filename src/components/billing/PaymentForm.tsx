"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { AlertCircle, CheckCircle, X } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

// Load Stripe outside of component to avoid recreating on every render
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

// Static price info (not translated - monetary values)
const PLAN_PRICES: Record<string, { price: string; period: string }> = {
  pro: { price: "$14.99", period: "/user/mo" },
  max: { price: "$34.99", period: "/user/mo" },
  credits_100k: { price: "$19.99", period: "" },
  credits_250k: { price: "$49.99", period: "" },
  credits_600k: { price: "$99.99", period: "" },
  credits_1500k: { price: "$199.98", period: "" },
};

function getPlanName(itemId: string, t: (key: string) => string): string {
  if (itemId === "pro") return t("billing.plans.pro");
  if (itemId === "max") return t("billing.plans.max");
  return t(`billing.creditPackages.${itemId}`) || itemId;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  type: "subscription" | "credits";
  itemId: string;
}

export function PaymentModal({
  isOpen,
  onClose,
  onComplete,
  type,
  itemId,
}: PaymentModalProps) {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "complete">("loading");
  const priceInfo = PLAN_PRICES[itemId];
  const planName = getPlanName(itemId, t);

  // Ensure we only render portal on client side
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Reset state when modal closes/opens
  useEffect(() => {
    if (isOpen) {
      setStatus("loading");
      setError(null);
    }
  }, [isOpen]);

  // Fetch client secret for Stripe
  const fetchClientSecret = useCallback(async () => {
    try {
      const endpoint =
        type === "subscription"
          ? "/api/billing/checkout/subscription"
          : "/api/billing/checkout/credits";

      const body =
        type === "subscription"
          ? { tier: itemId }
          : { packageId: itemId };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      setStatus("ready");
      return data.data.clientSecret;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      setStatus("error");
      throw err;
    }
  }, [type, itemId]);

  const handleComplete = useCallback(() => {
    setStatus("complete");
    setTimeout(() => {
      onComplete();
    }, 2000);
  }, [onComplete]);

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center animate-in fade-in duration-200 p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal content */}
      <div className="relative z-10 w-full max-w-[480px] max-h-[90vh] overflow-y-auto bg-card rounded-2xl shadow-2xl border border-border animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-border bg-card">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {type === "subscription"
                ? t("billing.checkout.subscribeTo", { plan: planName })
                : t("billing.checkout.purchase", { plan: planName })}
            </h2>
            <p className="text-sm text-muted-foreground">
              {priceInfo?.price}{priceInfo?.period}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-secondary transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {status === "error" && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="font-medium text-foreground">{t("billing.checkout.error")}</p>
                <p className="text-sm text-muted-foreground mt-1">{error || t("billing.checkout.errorFallback")}</p>
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 text-sm transition-colors cursor-pointer"
              >
                {t("billing.checkout.close")}
              </button>
            </div>
          )}

          {status === "complete" && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-success" />
              </div>
              <div className="text-center">
                <p className="font-medium text-foreground">{t("billing.checkout.success")}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {type === "subscription"
                    ? t("billing.checkout.subscriptionActive")
                    : t("billing.checkout.creditsAdded")}
                </p>
              </div>
            </div>
          )}

          {(status === "loading" || status === "ready") && (
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{
                fetchClientSecret,
                onComplete: handleComplete,
              }}
            >
              <div className="stripe-checkout-container">
                <EmbeddedCheckout />
              </div>
            </EmbeddedCheckoutProvider>
          )}
        </div>
      </div>

      {/* Custom styles to override Stripe's default styling */}
      <style jsx global>{`
        .stripe-checkout-container iframe {
          border-radius: 12px;
        }
      `}</style>
    </div>
  );

  return createPortal(modalContent, document.body);
}
