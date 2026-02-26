import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DealCard, DealCardOverlay } from "@/components/crm/deal-card";
import type { DealForCard } from "@/components/crm/deal-card";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

// Mock dnd-kit
vi.mock("@dnd-kit/core", () => ({
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    isDragging: false,
  }),
}));
vi.mock("@dnd-kit/utilities", () => ({
  CSS: { Transform: { toString: () => "" } },
}));

// Mock i18n
vi.mock("@/lib/i18n", () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: "en" }),
}));

// Helper function to create test deal
function makeDeal(overrides?: Partial<DealForCard>): DealForCard {
  return {
    id: "deal-1",
    title: "Big Deal",
    value: 10000,
    ai_win_probability: 75,
    expected_close_date: null,
    contacts: null,
    companies: null,
    ...overrides,
  };
}

describe("DealCard", () => {
  it("renders deal title as a link to /dashboard/deals/{id}", () => {
    const deal = makeDeal({ id: "deal-123", title: "Test Deal" });
    render(<DealCard deal={deal} />);

    const link = screen.getByRole("link", { name: "Test Deal" });
    expect(link).toHaveAttribute("href", "/dashboard/deals/deal-123");
  });

  it("renders formatted value ($10,000)", () => {
    const deal = makeDeal({ value: 10000 });
    render(<DealCard deal={deal} />);

    expect(screen.getByText("$10,000")).toBeInTheDocument();
  });

  it("renders company name when provided", () => {
    const deal = makeDeal({
      companies: { id: "comp-1", name: "Acme Corp" },
    });
    render(<DealCard deal={deal} />);

    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("does not render company when null", () => {
    const deal = makeDeal({ companies: null });
    render(<DealCard deal={deal} />);

    // No company-related icon or text should be present
    const container = screen.getByRole("link").parentElement;
    expect(container?.textContent).not.toContain("Acme");
  });

  it("renders contact name when provided", () => {
    const deal = makeDeal({
      contacts: { id: "contact-1", first_name: "John", last_name: "Doe" },
    });
    render(<DealCard deal={deal} />);

    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("does not render contact when null", () => {
    const deal = makeDeal({ contacts: null });
    render(<DealCard deal={deal} />);

    const container = screen.getByRole("link").parentElement;
    expect(container?.textContent).not.toContain("John");
  });

  it("shows 'Hot' badge (emerald) for probability >= 70", () => {
    const deal = makeDeal({ ai_win_probability: 75 });
    render(<DealCard deal={deal} />);

    const badge = screen.getByText(/crm\.pipeline\.hot/i);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("text-emerald-600");
    expect(badge.textContent).toContain("75%");
  });

  it("shows 'Warm' badge (amber) for probability >= 40 and < 70", () => {
    const deal = makeDeal({ ai_win_probability: 55 });
    render(<DealCard deal={deal} />);

    const badge = screen.getByText(/crm\.pipeline\.warm/i);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("text-amber-600");
    expect(badge.textContent).toContain("55%");
  });

  it("shows 'At Risk' badge (red) for probability < 40", () => {
    const deal = makeDeal({ ai_win_probability: 25 });
    render(<DealCard deal={deal} />);

    const badge = screen.getByText(/crm\.pipeline\.atRisk/i);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("text-red-600");
    expect(badge.textContent).toContain("25%");
  });

  it("shows rotting indicator when is_rotting=true", () => {
    const deal = makeDeal({ is_rotting: true });
    render(<DealCard deal={deal} />);

    const rottingBadge = screen.getByText(/crm\.pipeline\.rottingLabel/i);
    expect(rottingBadge).toBeInTheDocument();
    expect(rottingBadge).toHaveClass("text-red-600");
  });

  it("does not show rotting when is_rotting=false", () => {
    const deal = makeDeal({ is_rotting: false });
    render(<DealCard deal={deal} />);

    const rottingBadge = screen.queryByText(/crm\.pipeline\.rottingLabel/i);
    expect(rottingBadge).not.toBeInTheDocument();
  });

  it("renders close date when provided", () => {
    const deal = makeDeal({ expected_close_date: "2026-03-15" });
    render(<DealCard deal={deal} />);

    // Date should be formatted as "Mar 15" in en-US locale
    expect(screen.getByText(/Mar 15/i)).toBeInTheDocument();
  });
});

describe("DealCardOverlay", () => {
  it("renders deal title", () => {
    const deal = makeDeal({ title: "Overlay Deal" });
    render(<DealCardOverlay deal={deal} />);

    expect(screen.getByText("Overlay Deal")).toBeInTheDocument();
  });

  it("renders value", () => {
    const deal = makeDeal({ value: 50000 });
    render(<DealCardOverlay deal={deal} />);

    expect(screen.getByText("$50,000")).toBeInTheDocument();
  });

  it("does NOT use hooks (no errors without providers)", () => {
    const deal = makeDeal();

    // Should render without throwing errors since DealCardOverlay doesn't use any hooks
    expect(() => render(<DealCardOverlay deal={deal} />)).not.toThrow();
  });
});
