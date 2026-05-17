"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ReactNode } from "react";
import { ThemedClerkProvider } from "./clerk-provider";
import { Toaster } from "@/components/ui/sonner";
import { LanguageProvider } from "@/lib/i18n";
import { CookieConsentBanner } from "./cookie-consent/banner";
import { RegisterSW } from "./pwa/register-sw";
import { InstallPrompt } from "./pwa/install-prompt";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ThemedClerkProvider>
        <LanguageProvider>
          {children}
          <Toaster richColors position="bottom-right" />
          <CookieConsentBanner />
          <RegisterSW />
          <InstallPrompt />
        </LanguageProvider>
      </ThemedClerkProvider>
    </NextThemesProvider>
  );
}
