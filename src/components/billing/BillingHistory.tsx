"use client";

import { useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { logger } from "@/lib/logger";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Receipt, ExternalLink, Download, Loader2 } from "lucide-react";
import { PaymentHistory } from "@/types";

interface BillingHistoryProps {
  payments: PaymentHistory[];
  className?: string;
}

export function BillingHistory({ payments, className }: BillingHistoryProps) {
  const { t } = useTranslation();

  const formatDate = (date: Date | string) => {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatAmount = (cents: number, currency: string) => {
    const amount = cents / 100;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const getPaymentTypeLabel = (type: string) => {
    switch (type) {
      case "subscription":
        return t("billing.history.subscription");
      case "credit_package":
        return t("billing.history.credits");
      case "renewal":
        return t("billing.history.renewal");
      default:
        return type;
    }
  };

  if (payments.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="size-5" />
            {t("billing.history.title")}
          </CardTitle>
          <CardDescription>
            {t("billing.history.emptyState")}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Receipt className="size-5" />
          {t("billing.history.title")}
        </CardTitle>
        <CardDescription>
          {t("billing.history.description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("billing.history.date")}</TableHead>
              <TableHead>{t("billing.history.type")}</TableHead>
              <TableHead>{t("billing.history.descriptionCol")}</TableHead>
              <TableHead className="text-right">{t("billing.history.amount")}</TableHead>
              <TableHead className="text-center">{t("billing.history.status")}</TableHead>
              <TableHead className="text-right">{t("billing.history.invoice")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell className="font-medium">
                  {formatDate(payment.completedAt || payment.createdAt)}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {getPaymentTypeLabel(payment.paymentType)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {payment.tierOrPackage
                    ? payment.tierOrPackage.charAt(0).toUpperCase() +
                      payment.tierOrPackage.slice(1).replace(/_/g, " ")
                    : "-"}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatAmount(payment.amountCents, payment.currency)}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline">{payment.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {payment.stripeInvoiceId ? (
                    <Button variant="ghost" size="sm" asChild>
                      <a
                        href={`https://dashboard.stripe.com/invoices/${payment.stripeInvoiceId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download className="mr-1 size-3" />
                        PDF
                      </a>
                    </Button>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

interface ManageSubscriptionButtonProps {
  customerId: string | null;
  className?: string;
}

export function ManageSubscriptionButton({
  customerId,
  className,
}: ManageSubscriptionButtonProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (!customerId || isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
      });
      const data = await response.json();

      if (data.success && data.data?.url) {
        // Use location.href instead of window.open to avoid popup blockers
        window.location.href = data.data.url;
      } else {
        logger.error('BillingHistory', 'Portal error:', data.error || 'No URL returned');
        setIsLoading(false);
      }
    } catch (error) {
      logger.error('BillingHistory', 'Failed to open billing portal:', error);
      setIsLoading(false);
    }
  };

  if (!customerId) return null;

  return (
    <Button
      variant="outline"
      onClick={handleClick}
      className={className}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="mr-2 size-4 animate-spin" />
      ) : (
        <ExternalLink className="mr-2 size-4" />
      )}
      {t("billing.history.manageSubscription")}
    </Button>
  );
}
