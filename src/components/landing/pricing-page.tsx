"use client";

import { PublicAuthHeader } from "@/components/public-auth-header";
import { PricingSection } from "./pricing-section";

export function PricingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <PublicAuthHeader />
      <main className="flex-1">
        <PricingSection />
      </main>
    </div>
  );
}
