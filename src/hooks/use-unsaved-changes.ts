"use client";

import { useEffect } from "react";

/**
 * Warns users before leaving the page if there are unsaved changes.
 * Uses the native `beforeunload` event.
 */
export function useUnsavedChanges(hasChanges: boolean) {
  useEffect(() => {
    if (!hasChanges) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasChanges]);
}
