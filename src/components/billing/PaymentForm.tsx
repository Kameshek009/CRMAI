"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { AlertCircle, CheckCircle, X } from "lucide-react";

// Load Stripe outside of component to avoid recreating on every render
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

// Plan info for display
const PLAN_INFO: Record<string, { name: string; price: string; period: string; description: string }> = {
  pro: {
    name: "Pro",
    price: "$15",
    period: "/user/mo",
    description: "For professionals who need more power",
  },
  max: {
    name: "Max",
    price: "$35",
    period: "/user/mo",
    description: "Maximum capabilities for power users",
  },
  credits_20m: {
    name: "20M Tokens",
    price: "$10",
    period: "",
    description: "One-time token credit purchase",
  },
  credits_50m: {
    name: "50M Tokens",
    price: "$20",
    period: "",
    description: "One-time token credit purchase",
  },
  credits_100m: {
    name: "100M Tokens",
    price: "$35",
    period: "",
    description: "One-time token credit purchase",
  },
  credits_500m: {
    name: "500M Tokens",
    price: "$150",
    period: "",
    description: "One-time token credit purchase",
  },
};

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
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "complete">("loading");
  const planInfo = PLAN_INFO[itemId];

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
              {type === "subscription" ? "Subscribe to " : "Purchase "}
              {planInfo?.name}
            </h2>
            <p className="text-sm text-muted-foreground">
              {planInfo?.price}{planInfo?.period}
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
                <p className="font-medium text-foreground">Something went wrong</p>
                <p className="text-sm text-muted-foreground mt-1">{error || "Please try again"}</p>
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 text-sm transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          )}

          {status === "complete" && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-success" />
              </div>
              <div className="text-center">
                <p className="font-medium text-foreground">Payment complete</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {type === "subscription"
                    ? "Your subscription is now active."
                    : "Credits have been added to your account."}
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
