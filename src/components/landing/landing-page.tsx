"use client";

import { PublicAuthHeader } from "@/components/public-auth-header";
import { HeroSection } from "./hero-section";
import { TrustedBySection } from "./trusted-by-section";

export function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <PublicAuthHeader />
      <main className="flex-1">
        <HeroSection />
        <TrustedBySection />
      </main>
    </div>
  );
}
