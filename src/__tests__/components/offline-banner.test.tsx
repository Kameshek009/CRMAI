import React from "react";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { OfflineBanner } from "@/components/offline-banner";

// Mock useTranslation
vi.mock("@/lib/i18n", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock lucide-react
vi.mock("lucide-react", () => ({
  WifiOff: ({ className }: { className?: string }) => (
    <svg data-testid="wifi-off-icon" className={className} />
  ),
}));

describe("OfflineBanner", () => {
  const originalOnLine = navigator.onLine;

  beforeEach(() => {
    Object.defineProperty(navigator, "onLine", {
      writable: true,
      configurable: true,
      value: true,
    });
  });

  afterEach(() => {
    cleanup();
    Object.defineProperty(navigator, "onLine", {
      writable: true,
      configurable: true,
      value: originalOnLine,
    });
  });

  it("renders nothing when online", () => {
    const { container } = render(<OfflineBanner />);
    expect(container.firstChild).toBeNull();
  });

  it("renders banner when offline", () => {
    Object.defineProperty(navigator, "onLine", {
      writable: true,
      configurable: true,
      value: false,
    });

    render(<OfflineBanner />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("common.offline")).toBeInTheDocument();
    expect(screen.getByText("common.offlineDescription")).toBeInTheDocument();
  });

  it("shows banner when going offline", () => {
    const { container } = render(<OfflineBanner />);
    expect(container.firstChild).toBeNull();

    act(() => {
      Object.defineProperty(navigator, "onLine", {
        writable: true,
        configurable: true,
        value: false,
      });
      window.dispatchEvent(new Event("offline"));
    });

    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("hides banner when going back online", () => {
    Object.defineProperty(navigator, "onLine", {
      writable: true,
      configurable: true,
      value: false,
    });

    render(<OfflineBanner />);
    expect(screen.getByRole("alert")).toBeInTheDocument();

    act(() => {
      Object.defineProperty(navigator, "onLine", {
        writable: true,
        configurable: true,
        value: true,
      });
      window.dispatchEvent(new Event("online"));
    });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders wifi-off icon", () => {
    Object.defineProperty(navigator, "onLine", {
      writable: true,
      configurable: true,
      value: false,
    });

    render(<OfflineBanner />);
    expect(screen.getByTestId("wifi-off-icon")).toBeInTheDocument();
  });
});
