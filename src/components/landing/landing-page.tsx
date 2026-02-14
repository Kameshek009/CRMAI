"use client";

import { PublicAuthHeader } from "@/components/public-auth-header";
import { HeroSection } from "./hero-section";
import { TrustedBySection } from "./trusted-by-section";
import { FeaturesSection } from "./features-section";
import { AISection } from "./ai-section";
import { StatsSection } from "./stats-section";
import { TestimonialsSection } from "./testimonials-section";
import { CTASection } from "./cta-section";
import { FooterSection } from "./footer-section";

export function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <PublicAuthHeader />
      <main className="flex-1">
        <HeroSection />
        <TrustedBySection />
        <FeaturesSection />
        <AISection />
        <StatsSection />
        <TestimonialsSection />
        <CTASection />
      </main>
      <FooterSection />
    </div>
  );
}
