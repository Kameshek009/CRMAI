"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Global keyboard shortcuts for the CRM app.
 * - ? → show help (future)
 * - g then c → go to contacts
 * - g then d → go to deals
 * - g then l → go to leads
 * - g then t → go to tasks
 * - g then o → go to companies (organizations)
 * - g then s → go to settings
 * - g then h → go to dashboard (home)
 */
export function useKeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    let gPressed = false;
    let gTimer: ReturnType<typeof setTimeout>;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing in inputs/textareas/contenteditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      // Ignore with modifier keys (except shift for ?)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toLowerCase();

      // "g" prefix navigation
      if (gPressed) {
        gPressed = false;
        clearTimeout(gTimer);
        e.preventDefault();

        const routes: Record<string, string> = {
          c: "/dashboard/contacts",
          d: "/dashboard/deals",
          l: "/dashboard/leads",
          t: "/dashboard/tasks",
          o: "/dashboard/companies",
          s: "/dashboard/account",
          h: "/dashboard",
          p: "/dashboard/pipeline",
        };

        if (routes[key]) {
          router.push(routes[key]);
        }
        return;
      }

      if (key === "g") {
        gPressed = true;
        gTimer = setTimeout(() => {
          gPressed = false;
        }, 500);
        return;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      clearTimeout(gTimer);
    };
  }, [router]);
}
