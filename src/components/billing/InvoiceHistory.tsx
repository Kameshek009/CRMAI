"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Download, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InvoiceInfo } from "./CustomerBillingCard";

interface InvoiceHistoryProps {
  invoices: InvoiceInfo[];
  isLoading?: boolean;
  className?: string;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatAmount(cents: number, currency: string): string {
  const amount = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount);
}

function getStatusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "paid":
      return "default";
    case "open":
      return "secondary";
    case "draft":
      return "outline";
    case "void":
    case "uncollectible":
      return "destructive";
    default:
      return "secondary";
  }
}

export function InvoiceHistory({
  invoices,
  isLoading,
  className,
}: InvoiceHistoryProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!invoices || invoices.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="size-4" />
            Invoices
          </CardTitle>
          <CardDescription>
            No invoices yet. Invoices will appear here after your first payment.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="size-4" />
          Invoices
        </CardTitle>
        <CardDescription>
          Your recent invoices and payment history
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell>{formatDate(invoice.created)}</TableCell>
                <TableCell className="font-mono text-sm">
                  {invoice.number || "-"}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatAmount(invoice.amountPaid || invoice.amountDue, invoice.currency)}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={getStatusVariant(invoice.status)}>
                    {invoice.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {invoice.hostedInvoiceUrl && (
                      <Button variant="ghost" size="icon" className="size-8" asChild>
                        <a
                          href={invoice.hostedInvoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="View invoice"
                        >
                          <ExternalLink className="size-4" />
                        </a>
                      </Button>
                    )}
                    {invoice.pdfUrl && (
                      <Button variant="ghost" size="icon" className="size-8" asChild>
                        <a
                          href={invoice.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Download PDF"
                        >
                          <Download className="size-4" />
                        </a>
                      </Button>
                    )}
                    {!invoice.hostedInvoiceUrl && !invoice.pdfUrl && (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
