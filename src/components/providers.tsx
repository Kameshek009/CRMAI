"use client";

import { HeroUIProvider } from "@heroui/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useRouter } from "next/navigation";
import { ReactNode } from "react";
import { ThemedClerkProvider } from "./clerk-provider";
import { Toaster } from "@/components/ui/sonner";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const router = useRouter();

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <ThemedClerkProvider>
        <HeroUIProvider navigate={router.push}>
          {children}
          <Toaster richColors position="bottom-right" />
        </HeroUIProvider>
      </ThemedClerkProvider>
    </NextThemesProvider>
  );
}
