"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  readConsentFromCookie,
  writeConsentCookie,
  type ConsentChoices,
} from "@/lib/gdpr/consent";

const SHOW_EVENT = "nexxus:open-cookie-preferences";

// Other code can dispatch this event to reopen the preferences modal.
// Used by the footer "Cookie preferences" link.
export function openCookiePreferences(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SHOW_EVENT));
  }
}

async function syncToServer(choices: ConsentChoices): Promise<void> {
  try {
    await fetch("/api/account/cookie-consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(choices),
    });
  } catch {
    // Server sync is best-effort; the cookie itself is authoritative.
  }
}

export function CookieConsentBanner() {
  // `null` = haven't checked yet (SSR / first paint). undefined → hide.
  const [needsChoice, setNeedsChoice] = useState<boolean | null>(null);
  const [showCustomize, setShowCustomize] = useState(false);
  const [draft, setDraft] = useState<ConsentChoices>({ analytics: true, marketing: false });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: read cookie after mount to avoid SSR/CSR hydration mismatch
    setNeedsChoice(readConsentFromCookie() === null);
    const onOpen = () => {
      const existing = readConsentFromCookie();
      if (existing) {
        setDraft({ analytics: existing.analytics, marketing: existing.marketing });
      }
      setShowCustomize(true);
    };
    window.addEventListener(SHOW_EVENT, onOpen);
    return () => window.removeEventListener(SHOW_EVENT, onOpen);
  }, []);

  function save(choices: ConsentChoices) {
    writeConsentCookie(choices);
    void syncToServer(choices);
    setNeedsChoice(false);
    setShowCustomize(false);
  }

  if (needsChoice === null) return null;

  return (
    <>
      {needsChoice && !showCustomize && (
        <div
          role="region"
          aria-label="Cookie consent"
          className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl rounded-lg border border-border bg-background/95 p-4 shadow-lg backdrop-blur sm:p-5"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-foreground">
              <p className="font-medium">We use cookies</p>
              <p className="mt-1 text-muted-foreground">
                Essential cookies keep the app working. With your permission we also use analytics and marketing cookies to improve the product. See our{" "}
                <a href="/privacy" className="underline underline-offset-2">privacy policy</a>.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" onClick={() => save({ analytics: false, marketing: false })}>
                Reject all
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowCustomize(true)}>
                Customize
              </Button>
              <Button size="sm" onClick={() => save({ analytics: true, marketing: true })}>
                Accept all
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={showCustomize} onOpenChange={setShowCustomize}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cookie preferences</DialogTitle>
            <DialogDescription>
              Choose which categories of cookies Nexxus may set on your device. You can change this anytime from the footer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Label className="text-sm font-medium">Essential</Label>
                <p className="text-xs text-muted-foreground">Required for authentication and security. Always on.</p>
              </div>
              <Switch checked disabled />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <Label htmlFor="consent-analytics" className="text-sm font-medium">Analytics</Label>
                <p className="text-xs text-muted-foreground">Helps us measure feature usage and crash rates.</p>
              </div>
              <Switch
                id="consent-analytics"
                checked={draft.analytics}
                onCheckedChange={(v) => setDraft((d) => ({ ...d, analytics: v }))}
              />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <Label htmlFor="consent-marketing" className="text-sm font-medium">Marketing</Label>
                <p className="text-xs text-muted-foreground">Lets us measure ad campaigns and reach users with relevant offers.</p>
              </div>
              <Switch
                id="consent-marketing"
                checked={draft.marketing}
                onCheckedChange={(v) => setDraft((d) => ({ ...d, marketing: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => save({ analytics: false, marketing: false })}>
              Reject all
            </Button>
            <Button onClick={() => save(draft)}>Save preferences</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
