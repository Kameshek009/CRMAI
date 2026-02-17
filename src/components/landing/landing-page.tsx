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

function SectionDivider() {
  return (
    <div className="relative h-px w-full max-w-4xl mx-auto">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-landing-accent/20 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-landing-accent/10 to-transparent blur-sm" />
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground scroll-smooth">
      {/* Noise texture overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-[100] opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
        }}
      />

      <PublicAuthHeader />
      <main className="flex-1">
        <HeroSection />
        <SectionDivider />
        <TrustedBySection />
        <SectionDivider />
        <FeaturesSection />
        <SectionDivider />
        <AISection />
        <SectionDivider />
        <StatsSection />
        <SectionDivider />
        <TestimonialsSection />
        <CTASection />
      </main>
      <FooterSection />
    </div>
  );
}
