"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CREDIT_PACKAGES } from "@/types";

interface CreditPackageCardProps {
  packageId: string;
  onPurchase: (packageId: string) => void;
  isLoading?: boolean;
  recommended?: boolean;
  className?: string;
}

export function CreditPackageCard({
  packageId,
  onPurchase,
  isLoading,
  recommended,
  className,
}: CreditPackageCardProps) {
  const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId);
  if (!pkg) return null;

  const formatTokens = (amount: number) => {
    if (amount >= 1_000_000) {
      return `${amount / 1_000_000}M`;
    }
    return `${amount / 1_000}K`;
  };

  const price = pkg.priceCents / 100;
  const pricePerMillion = (price / (pkg.tokenAmount / 1_000_000)).toFixed(2);

  return (
    <Card className={cn("relative", recommended && "ring-1 ring-primary", className)}>
      {recommended && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2" variant="default">
          Best Value
        </Badge>
      )}
      <CardContent className="p-6 space-y-5">
        {/* Package amount */}
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-secondary">
            <Coins className="size-6" />
          </div>
          <div className="space-y-1">
            <p className="text-xl font-bold">{formatTokens(pkg.tokenAmount)}</p>
            <p className="text-sm text-muted-foreground">tokens</p>
          </div>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">${price}</span>
          <span className="text-sm text-muted-foreground">(${pricePerMillion}/M)</span>
        </div>

        {/* Purchase button */}
        <Button
          variant={recommended ? "default" : "outline"}
          className="w-full h-11"
          onClick={() => onPurchase(packageId)}
          disabled={isLoading}
        >
          {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
          Buy Credits
        </Button>
      </CardContent>
    </Card>
  );
}

interface CreditPackageGridProps {
  onPurchase: (packageId: string) => void;
  loadingPackageId?: string | null;
  className?: string;
}

export function CreditPackageGrid({
  onPurchase,
  loadingPackageId,
  className,
}: CreditPackageGridProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold flex items-center gap-3">
          <Coins className="size-5" />
          Credit Packages
        </h2>
        <p className="text-muted-foreground">
          One-time purchases that add tokens to your account. Perfect for
          enterprise usage or when you need extra capacity.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {CREDIT_PACKAGES.map((pkg, index) => (
          <CreditPackageCard
            key={pkg.id}
            packageId={pkg.id}
            onPurchase={onPurchase}
            isLoading={loadingPackageId === pkg.id}
            recommended={index === 2}
          />
        ))}
      </div>
    </div>
  );
}
