"use client";

import { useEffect } from "react";

// Mounted once at the app root. Registers /sw.js in production builds —
// dev mode is skipped so source-map churn does not constantly invalidate
// the cache.
export function RegisterSW() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const register = () =>
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => {
          // Silent — SW registration failure should not surface to the user.
        });

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }
  }, []);

  return null;
}
