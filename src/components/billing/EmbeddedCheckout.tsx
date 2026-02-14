"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { loadStripe, StripeEmbeddedCheckout } from "@stripe/stripe-js";
import { AlertCircle, CheckCircle, X, RefreshCw, Loader2 } from "lucide-react";

// Load Stripe outside of component to avoid recreating on every render
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

// Timeout for checkout initialization (15 seconds)
const CHECKOUT_TIMEOUT_MS = 15000;

interface EmbeddedCheckoutProps {
  /**
   * Type of checkout: subscription or credits
   */
  type: "subscription" | "credits";
  /**
   * For subscriptions: "pro" | "max"
   * For credits: "credits_20m" | "credits_50m" | "credits_100m" | "credits_500m"
   */
  itemId: string;
  /**
   * Called when checkout is complete
   */
  onComplete?: (sessionId: string) => void;
  /**
   * Called when user closes the checkout
   */
  onClose?: () => void;
  /**
   * Called when an error occurs
   */
  onError?: (error: string) => void;
  /**
   * Hide the internal close button (when used inside modal with its own close button)
   */
  hideCloseButton?: boolean;
}

type CheckoutState = "loading" | "ready" | "error" | "complete";

/**
 * EmbeddedCheckout Component
 *
 * Wraps Stripe's Embedded Checkout for seamless payment experience.
 * Handles both subscription and credit package purchases.
 *
 * Usage:
 * ```tsx
 * <EmbeddedCheckout
 *   type="subscription"
 *   itemId="pro"
 *   onComplete={(sessionId) => console.log("Paid!", sessionId)}
 *   onClose={() => setShowCheckout(false)}
 * />
 * ```
 */
export function EmbeddedCheckout({
  type,
  itemId,
  onComplete,
  onClose,
  onError,
  hideCloseButton = false,
}: EmbeddedCheckoutProps) {
  const [state, setState] = useState<CheckoutState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const checkoutRef = useRef<HTMLDivElement>(null);
  const embeddedCheckoutRef = useRef<StripeEmbeddedCheckout | null>(null);

  /**
   * Fetch client secret from our API with timeout
   */
  const fetchClientSecret = useCallback(async (): Promise<string> => {
    const endpoint =
      type === "subscription"
        ? "/api/billing/checkout/subscription"
        : "/api/billing/checkout/credits";

    const body =
      type === "subscription"
        ? { tier: itemId }
        : { packageId: itemId };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CHECKOUT_TIMEOUT_MS);

    console.log("[Checkout] Fetching client secret from:", endpoint, body);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        console.error("[Checkout] API error:", response.status, response.statusText);
        // Try to get error message from response
        const text = await response.text();
        let errorMessage = `Server error (${response.status})`;
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Response wasn't JSON, use status text
          if (text.includes("<!DOCTYPE") || text.includes("<html")) {
            errorMessage = `Server error (${response.status}). Please try again later.`;
          }
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log("[Checkout] API response:", { success: data.success, hasClientSecret: !!data.data?.clientSecret });

      if (!data.success) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      if (!data.data?.clientSecret) {
        throw new Error("No client secret returned from server");
      }

      return data.data.clientSecret;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error("[Checkout] fetchClientSecret error:", error);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Request timed out. Please check your connection and try again.");
      }
      throw error;
    }
  }, [type, itemId]);

  /**
   * Initialize embedded checkout with timeout protection
   */
  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout | null = null;
    let initCompleted = false;

    async function initCheckout() {
      try {
        setState("loading");
        setErrorMessage(null);

        console.log("[Checkout] Starting initialization for:", type, itemId);

        // Set a timeout for the entire initialization process
        timeoutId = setTimeout(() => {
          if (mounted && !initCompleted) {
            console.error("[Checkout] Initialization timed out after", CHECKOUT_TIMEOUT_MS, "ms");
            setErrorMessage("Checkout is taking too long to load. Please try again.");
            setState("error");
            onError?.("Checkout timeout");
          }
        }, CHECKOUT_TIMEOUT_MS);

        // Load Stripe
        console.log("[Checkout] Loading Stripe.js...");
        const stripe = await stripePromise;
        if (!stripe) {
          throw new Error("Failed to load payment system. Please refresh and try again.");
        }
        console.log("[Checkout] Stripe.js loaded successfully");
        if (!mounted) return;

        // Fetch client secret
        console.log("[Checkout] Fetching client secret...");
        const clientSecret = await fetchClientSecret();
        console.log("[Checkout] Client secret received");
        if (!mounted) return;

        // Initialize embedded checkout
        console.log("[Checkout] Initializing Stripe Embedded Checkout...");
        const embeddedCheckout = await stripe.initEmbeddedCheckout({
          clientSecret,
          onComplete: () => {
            console.log("[Checkout] Payment completed!");
            setState("complete");
            onComplete?.("completed");
          },
        });
        console.log("[Checkout] Stripe Embedded Checkout initialized");

        if (!mounted) {
          embeddedCheckout.destroy();
          return;
        }

        embeddedCheckoutRef.current = embeddedCheckout;

        // Mount to container - container should always exist now
        console.log("[Checkout] Mounting to container...");
        if (!checkoutRef.current) {
          // This shouldn't happen now that container is always rendered
          console.error("[Checkout] Container ref is null - waiting for next render");
          throw new Error("Checkout container not ready. Please try again.");
        }
        embeddedCheckout.mount(checkoutRef.current);
        initCompleted = true;
        if (timeoutId) clearTimeout(timeoutId);
        setState("ready");
        console.log("[Checkout] Checkout is ready!");
      } catch (error) {
        if (!mounted) return;
        initCompleted = true;
        if (timeoutId) clearTimeout(timeoutId);

        console.error("[Checkout] Initialization failed:", error);
        const message =
          error instanceof Error ? error.message : "Failed to load checkout";
        setErrorMessage(message);
        setState("error");
        onError?.(message);
      }
    }

    initCheckout();

    // Cleanup
    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      if (embeddedCheckoutRef.current) {
        embeddedCheckoutRef.current.destroy();
        embeddedCheckoutRef.current = null;
      }
    };
  }, [fetchClientSecret, onComplete, onError, retryCount, type, itemId]);

  /**
   * Retry checkout initialization
   */
  const handleRetry = () => {
    if (embeddedCheckoutRef.current) {
      embeddedCheckoutRef.current.destroy();
      embeddedCheckoutRef.current = null;
    }
    setRetryCount((prev) => prev + 1);
  };

  /**
   * Handle close button click
   */
  const handleClose = () => {
    if (embeddedCheckoutRef.current) {
      embeddedCheckoutRef.current.destroy();
      embeddedCheckoutRef.current = null;
    }
    onClose?.();
  };

  // Always render the container so the ref is available for mounting
  // Overlay loading/error/complete states on top
  return (
    <div className="relative min-h-[400px] bg-card rounded-2xl overflow-hidden">
      {/* Close button - always visible except during loading (hidden when modal provides one) */}
      {onClose && state !== "loading" && !hideCloseButton && (
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 z-20 p-2 rounded-full hover:bg-secondary transition-colors"
          aria-label="Close checkout"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
      )}

      {/* Stripe Embedded Checkout container - ALWAYS in DOM */}
      {/* CSS overrides to remove Stripe's outer card wrapper and blend with our modal */}
      <div
        ref={checkoutRef}
        className={`min-h-[400px] transition-opacity duration-200 ${
          state === "ready" ? "opacity-100" : "opacity-0 pointer-events-none absolute inset-0"
        } [&_iframe]:!border-0 [&>div]:!bg-transparent [&>div]:!shadow-none [&>div]:!border-0 [&>div>div]:!bg-transparent [&>div>div]:!shadow-none [&>div>div]:!border-0 [&>div>div]:!p-0`}
        id="checkout-container"
        style={{
          // Additional styles to strip Stripe's wrapper
          // @ts-expect-error - CSS custom properties for Stripe overrides
          '--stripe-spacing': '0',
        }}
      />

      {/* Loading overlay - light theme to match Stripe checkout */}
      {state === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-card rounded-lg">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Preparing checkout...
          </p>
        </div>
      )}

      {/* Error overlay - light theme to match Stripe checkout */}
      {state === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 bg-card rounded-lg">
          <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="font-medium text-foreground">
              Something went wrong
            </p>
            <p className="text-sm text-muted-foreground mt-1 max-w-[300px]">
              {errorMessage || "Please try again"}
            </p>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleRetry}
              className="px-4 py-2 text-sm font-medium rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium rounded-full border border-border text-foreground hover:bg-secondary transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Complete overlay - light theme to match Stripe checkout */}
      {state === "complete" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 bg-card rounded-lg">
          <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-success" />
          </div>
          <div className="text-center">
            <p className="font-medium text-foreground">
              Payment complete
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {type === "subscription"
                ? "Your subscription is now active."
                : "Credits have been added to your account."}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="mt-4 px-4 py-2 text-sm font-medium rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Modal wrapper for EmbeddedCheckout
 * Provides a centered modal overlay with header and theme-consistent styling
 */
interface CheckoutModalProps extends EmbeddedCheckoutProps {
  isOpen: boolean;
}

// Plan info for header display
const PLAN_INFO: Record<string, { name: string; price: string; period: string; description: string }> = {
  pro: {
    name: "Pro",
    price: "$20",
    period: "/month",
    description: "For professionals who need more power",
  },
  max: {
    name: "Max",
    price: "$100",
    period: "/month",
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

export function CheckoutModal({
  isOpen,
  onClose,
  type,
  itemId,
  ...checkoutProps
}: CheckoutModalProps) {
  const [mounted, setMounted] = useState(false);

  const planInfo = PLAN_INFO[itemId] || {
    name: itemId,
    price: "",
    period: "",
    description: "",
  };

  // Ensure we only render portal on client side
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center animate-in fade-in duration-200">
      {/* Backdrop - covers entire screen including sidebar */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal content - minimal wrapper, let Stripe handle the UI */}
      <div className="relative z-10 w-full max-w-lg mx-4 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        {/* Close button - floating on top */}
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 z-20 p-2 rounded-full bg-secondary hover:bg-accent transition-colors cursor-pointer shadow-lg border border-border"
          aria-label="Close checkout"
        >
          <X className="w-5 h-5 text-foreground" />
        </button>

        {/* Stripe checkout - no extra wrapper, just the checkout */}
        <div className="rounded-2xl overflow-hidden shadow-2xl">
          <EmbeddedCheckout
            type={type}
            itemId={itemId}
            {...checkoutProps}
            onClose={onClose}
            hideCloseButton={true}
          />
        </div>
      </div>
    </div>
  );

  // Use portal to render at document.body level, bypassing any stacking context issues
  return createPortal(modalContent, document.body);
}
