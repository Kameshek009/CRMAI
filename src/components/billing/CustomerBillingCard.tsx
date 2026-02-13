"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CreditCard,
  Calendar,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface PaymentMethodInfo {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

export interface SubscriptionInfo {
  id: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  cancelAt: string | null;
  priceId: string;
  productName: string | null;
}

export interface InvoiceInfo {
  id: string;
  number: string | null;
  status: string;
  amountDue: number;
  amountPaid: number;
  currency: string;
  created: string;
  hostedInvoiceUrl: string | null;
  pdfUrl: string | null;
}

export interface CustomerBillingInfoData {
  customerId: string;
  email: string;
  name: string | null;
  created: string;
  paymentMethods: PaymentMethodInfo[];
  subscription: SubscriptionInfo | null;
  invoices: InvoiceInfo[];
  balance: number;
}

interface CustomerBillingCardProps {
  billingInfo: CustomerBillingInfoData | null;
  isLoading?: boolean;
  className?: string;
}

function getCardBrandInfo(brand: string): { name: string } {
  const brands: Record<string, { name: string }> = {
    visa: { name: "Visa" },
    mastercard: { name: "Mastercard" },
    amex: { name: "Amex" },
    discover: { name: "Discover" },
    diners: { name: "Diners" },
    jcb: { name: "JCB" },
    unionpay: { name: "UnionPay" },
  };
  return brands[brand] || { name: brand.toUpperCase() };
}

function getStatusInfo(status: string): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  icon: React.ReactNode;
} {
  switch (status) {
    case "active":
      return {
        label: "Active",
        variant: "default",
        icon: <CheckCircle2 className="size-3" />,
      };
    case "trialing":
      return {
        label: "Trial",
        variant: "secondary",
        icon: <Calendar className="size-3" />,
      };
    case "past_due":
      return {
        label: "Past Due",
        variant: "destructive",
        icon: <AlertCircle className="size-3" />,
      };
    case "canceled":
      return {
        label: "Canceled",
        variant: "secondary",
        icon: <AlertCircle className="size-3" />,
      };
    default:
      return {
        label: status,
        variant: "secondary",
        icon: null,
      };
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function CustomerBillingCard({
  billingInfo,
  isLoading,
  className,
}: CustomerBillingCardProps) {
  const [isPortalLoading, setIsPortalLoading] = React.useState(false);

  const handleOpenPortal = async () => {
    setIsPortalLoading(true);
    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
      });
      const data = await response.json();

      if (data.success && data.data.url) {
        window.open(data.data.url, "_blank");
      }
    } catch (error) {
      console.error("Failed to open billing portal:", error);
    } finally {
      setIsPortalLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (!billingInfo) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="size-4" />
            Payment Method
          </CardTitle>
          <CardDescription>
            No payment method on file. Add one when you upgrade your plan.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const defaultPaymentMethod = billingInfo.paymentMethods.find(
    (pm) => pm.isDefault
  );
  const subscription = billingInfo.subscription;
  const statusInfo = subscription ? getStatusInfo(subscription.status) : null;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="size-4" />
              Billing Details
            </CardTitle>
            <CardDescription>
              Your payment and subscription information
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenPortal}
            disabled={isPortalLoading}
          >
            {isPortalLoading ? (
              <Loader2 className="mr-2 size-3 animate-spin" />
            ) : (
              <ExternalLink className="mr-2 size-3" />
            )}
            Manage Billing
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Payment Method */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Payment Method
          </p>
          {defaultPaymentMethod ? (
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-secondary">
                <CreditCard className="size-5" />
              </div>
              <div>
                <p className="font-medium">
                  {getCardBrandInfo(defaultPaymentMethod.brand).name} ending in{" "}
                  {defaultPaymentMethod.last4}
                </p>
                <p className="text-sm text-muted-foreground">
                  Expires {defaultPaymentMethod.expMonth}/{defaultPaymentMethod.expYear}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No payment method on file</p>
          )}
        </div>

        {/* Subscription Status */}
        {subscription && statusInfo && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Subscription
            </p>
            <div className="flex items-center gap-3">
              <Badge variant={statusInfo.variant}>
                {statusInfo.icon}
                <span className="ml-1">{statusInfo.label}</span>
              </Badge>
              {subscription.cancelAtPeriodEnd && (
                <span className="text-sm text-muted-foreground">
                  Cancels on {formatDate(subscription.currentPeriodEnd)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Next Billing Date */}
        {subscription && subscription.status === "active" && !subscription.cancelAtPeriodEnd && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Next Billing Date
            </p>
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-muted-foreground" />
              <p className="font-medium">{formatDate(subscription.currentPeriodEnd)}</p>
            </div>
          </div>
        )}

        {/* Account Credit Balance */}
        {billingInfo.balance < 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Account Credit
            </p>
            <p className="font-medium">
              ${(Math.abs(billingInfo.balance) / 100).toFixed(2)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
