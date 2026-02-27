import React from "react";
import { describe, it, expect, vi, afterEach, beforeAll } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { SearchDialog } from "@/components/crm/search-dialog";

// jsdom doesn't implement scrollIntoView
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

// Mock i18n
vi.mock("@/lib/i18n", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "nav.search.placeholder": "Search...",
        "nav.search.groups.results": "Results",
        "nav.search.groups.actions": "Actions",
        "nav.search.groups.goTo": "Go to",
        "nav.search.commands.createContact": "Create Contact",
        "nav.search.commands.createDeal": "Create Deal",
        "nav.search.commands.createTask": "Create Task",
        "nav.search.pages.overview": "Overview",
        "nav.search.pages.overviewSub": "Dashboard overview",
        "nav.search.pages.contacts": "Contacts",
        "nav.search.pages.contactsSub": "Manage contacts",
        "nav.search.pages.deals": "Deals",
        "nav.search.pages.dealsSub": "Manage deals",
        "nav.search.pages.organizations": "Organizations",
        "nav.search.pages.organizationsSub": "Manage companies",
        "nav.search.pages.pipeline": "Pipeline",
        "nav.search.pages.pipelineSub": "View pipeline",
        "nav.search.pages.tasks": "Tasks",
        "nav.search.pages.tasksSub": "Manage tasks",
        "nav.search.pages.notes": "Notes",
        "nav.search.pages.notesSub": "View notes",
        "nav.search.pages.callLogs": "Call Logs",
        "nav.search.pages.analytics": "Analytics",
        "nav.search.pages.analyticsSub": "View analytics",
        "nav.search.pages.aiChat": "AI Chat",
        "nav.search.pages.aiChatSub": "Chat with AI",
        "nav.search.pages.settings": "Settings",
        "nav.search.pages.settingsSub": "Manage settings",
        "nav.search.hints.navigate": "Navigate",
        "nav.search.hints.open": "Open",
        "nav.search.hints.close": "Close",
        "nav.search.noResults": "No results for",
      };
      return translations[key] || key;
    },
    locale: "en",
  }),
}));

// Mock stores
vi.mock("@/stores/search-store", () => ({
  useSearchStore: () => ({ open: true, setOpen: vi.fn() }),
}));

// Mock router
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock Dialog to always render
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div role="dialog" aria-modal="true">{children}</div> : null,
  DialogContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

// Mock Input
vi.mock("@/components/ui/input", () => ({
  Input: React.forwardRef((props: Record<string, unknown>, ref: React.Ref<HTMLInputElement>) => (
    <input ref={ref} {...props} />
  )),
}));

afterEach(() => { cleanup(); });

describe("SearchDialog a11y", () => {
  it("renders with dialog role", () => {
    render(<SearchDialog />);
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("has search input with placeholder", () => {
    render(<SearchDialog />);
    const input = screen.getByPlaceholderText("Search...");
    expect(input).toBeTruthy();
    expect(input.tagName).toBe("INPUT");
  });

  it("results list has aria-live for dynamic updates", () => {
    const { container } = render(<SearchDialog />);
    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeTruthy();
  });

  it("command items are interactive buttons", () => {
    render(<SearchDialog />);
    const buttons = screen.getAllByRole("button");
    // Should have action buttons (create contact, deal, task) + nav items
    expect(buttons.length).toBeGreaterThan(3);
  });

  it("keyboard hints are visible in footer", () => {
    render(<SearchDialog />);
    expect(screen.getByText("Navigate")).toBeTruthy();
    expect(screen.getByText("Open")).toBeTruthy();
    expect(screen.getByText("Close")).toBeTruthy();
  });

  it("supports keyboard navigation with arrow keys", () => {
    render(<SearchDialog />);
    const input = screen.getByPlaceholderText("Search...");
    // Initial selected index is 0
    const firstItem = document.querySelector('[data-selected="true"]');
    expect(firstItem).toBeTruthy();

    // Press ArrowDown
    fireEvent.keyDown(input, { key: "ArrowDown" });
    const newSelected = document.querySelector('[data-selected="true"]');
    expect(newSelected).toBeTruthy();
    // Should be different from first (moved to next item)
    expect(newSelected).not.toBe(firstItem);
  });
});
