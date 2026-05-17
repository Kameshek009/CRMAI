import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://nexxuscrm.com"),
  title: {
    default: "Nexxus CRM",
    template: "%s | Nexxus CRM",
  },
  description: "Nexxus CRM — AI-Powered CRM for Growing Teams",
  keywords: ["nexxus", "crm", "ai", "sales", "pipeline", "contacts", "deals"],
  authors: [{ name: "Nexxus CRM" }],
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/icon.svg",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Nexxus",
    statusBarStyle: "default",
  },
  applicationName: "Nexxus CRM",
  formatDetection: { telephone: false },
  openGraph: {
    title: "Nexxus CRM",
    description: "AI-Powered CRM for Growing Teams",
    url: "/",
    siteName: "Nexxus CRM",
    locale: "en_US",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nexxus CRM",
    description: "AI-Powered CRM for Growing Teams",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f3f0" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        <link rel="dns-prefetch" href="https://img.clerk.com" />
        <link rel="preconnect" href="https://img.clerk.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
