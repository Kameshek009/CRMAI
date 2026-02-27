"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemedClerkProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true); // eslint-disable-line react-hooks/set-state-in-effect -- intentional hydration avoidance
  }, []);

  // Avoid hydration mismatch
  if (!mounted) {
    return (
      <ClerkProvider>
        {children}
      </ClerkProvider>
    );
  }

  return (
    <ClerkProvider
      appearance={{
        baseTheme: resolvedTheme === "dark" ? dark : undefined,
        variables: {
          colorPrimary: resolvedTheme === "dark" ? "#f8f8f8" : "#101010",
          colorBackground: resolvedTheme === "dark" ? "#080808" : "#ffffff",
          colorInputBackground: resolvedTheme === "dark" ? "#101010" : "#ffffff",
          colorInputText: resolvedTheme === "dark" ? "#f8f8f8" : "#101010",
          colorText: resolvedTheme === "dark" ? "#f8f8f8" : "#101010",
          colorTextSecondary: resolvedTheme === "dark" ? "#909090" : "#606060",
          colorDanger: "#ef4444",
          colorSuccess: "#22c55e",
          borderRadius: "8px",
        },
        elements: {
          card: {
            backgroundColor: resolvedTheme === "dark" ? "#101010" : "#ffffff",
            border: resolvedTheme === "dark" ? "1px solid #303030" : "1px solid #e0e0e0",
            boxShadow: "none",
          },
          headerTitle: {
            color: resolvedTheme === "dark" ? "#f8f8f8" : "#101010",
          },
          headerSubtitle: {
            color: resolvedTheme === "dark" ? "#909090" : "#606060",
          },
          socialButtonsBlockButton: {
            backgroundColor: resolvedTheme === "dark" ? "#202020" : "#f0f0f0",
            border: resolvedTheme === "dark" ? "1px solid #303030" : "1px solid #e0e0e0",
            color: resolvedTheme === "dark" ? "#f8f8f8" : "#101010",
            "&:hover": {
              backgroundColor: resolvedTheme === "dark" ? "#303030" : "#e0e0e0",
            },
          },
          formButtonPrimary: {
            backgroundColor: resolvedTheme === "dark" ? "#f8f8f8" : "#101010",
            color: resolvedTheme === "dark" ? "#080808" : "#ffffff",
            "&:hover": {
              backgroundColor: resolvedTheme === "dark" ? "#e0e0e0" : "#303030",
            },
          },
          footerActionLink: {
            color: "#3b82f6",
          },
          dividerLine: {
            backgroundColor: resolvedTheme === "dark" ? "#303030" : "#e0e0e0",
          },
          dividerText: {
            color: resolvedTheme === "dark" ? "#909090" : "#606060",
          },
          formFieldLabel: {
            color: resolvedTheme === "dark" ? "#f8f8f8" : "#101010",
          },
          formFieldInput: {
            backgroundColor: resolvedTheme === "dark" ? "#080808" : "#ffffff",
            borderColor: resolvedTheme === "dark" ? "#303030" : "#e0e0e0",
            color: resolvedTheme === "dark" ? "#f8f8f8" : "#101010",
            "&:focus": {
              borderColor: resolvedTheme === "dark" ? "#f8f8f8" : "#101010",
            },
          },
          identityPreviewText: {
            color: resolvedTheme === "dark" ? "#f8f8f8" : "#101010",
          },
          identityPreviewEditButton: {
            color: "#3b82f6",
          },
          userButtonPopoverCard: {
            backgroundColor: resolvedTheme === "dark" ? "#101010" : "#ffffff",
            border: resolvedTheme === "dark" ? "1px solid #303030" : "1px solid #e0e0e0",
          },
          userButtonPopoverActionButton: {
            color: resolvedTheme === "dark" ? "#f8f8f8" : "#101010",
            "&:hover": {
              backgroundColor: resolvedTheme === "dark" ? "#202020" : "#f0f0f0",
            },
          },
          userButtonPopoverActionButtonText: {
            color: resolvedTheme === "dark" ? "#f8f8f8" : "#101010",
          },
          userButtonPopoverFooter: {
            backgroundColor: resolvedTheme === "dark" ? "#080808" : "#f8f8f8",
          },
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
