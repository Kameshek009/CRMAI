import type { MetadataRoute } from "next";

// PWA manifest. Theme/background colors mirror the light-mode tokens in
// globals.css so the splash screen blends into the app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nexxus CRM",
    short_name: "Nexxus",
    description: "AI-powered CRM for growing teams",
    start_url: "/dashboard",
    display: "standalone",
    orientation: "any",
    background_color: "#f5f3f0",
    theme_color: "#111111",
    categories: ["productivity", "business"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
