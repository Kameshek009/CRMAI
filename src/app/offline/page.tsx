// Rendered when the service worker falls back here because the network is
// unreachable. Kept deliberately dependency-free so it loads even from a
// stale Next build.

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offline",
  description: "You are offline",
};

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="max-w-sm rounded-2xl border border-border bg-card/50 p-7 text-center backdrop-blur">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-foreground text-background text-2xl font-bold mb-4">
          N
        </div>
        <h1 className="text-lg font-semibold mb-2">You are offline</h1>
        <p className="text-sm text-muted-foreground mb-5">
          Reconnect to the internet to continue working in Nexxus CRM. Your last sync is preserved locally.
        </p>
        <a
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-md bg-foreground px-4 py-2 text-sm font-semibold text-background hover:opacity-90"
        >
          Try again
        </a>
      </div>
    </div>
  );
}
