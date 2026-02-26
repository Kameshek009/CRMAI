import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { CompanyCard } from "@/components/crm/company-card";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children?: React.ReactNode; [key: string]: unknown }) => <a href={href} {...props}>{children}</a>,
}));

// Mock Radix Avatar
vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children, className }: { children?: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
  AvatarFallback: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
  AvatarImage: () => null,
}));

// Mock Badge
vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <span {...props}>{children}</span>,
}));

// Mock Checkbox
vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({ checked, onCheckedChange, ...props }: { checked?: boolean; onCheckedChange?: (v: boolean) => void; [key: string]: unknown }) => (
    <button role="checkbox" aria-checked={!!checked} onClick={() => onCheckedChange?.(!checked)} {...props} />
  ),
}));

// Mock ScoreBadge (resolved from @/components/crm/score-badge)
vi.mock("@/components/crm/score-badge", () => ({
  ScoreBadge: ({ score }: { score: number }) => <div data-testid="score-badge">{score}</div>,
}));

interface CompanyCardProps {
  id: string;
  name: string;
  industry?: string | null;
  size?: string | null;
  domain?: string | null;
  aiHealthScore: number;
  contactCount?: number;
  selectable?: boolean;
  selected?: boolean;
  onSelectToggle?: (id: string) => void;
}

function makeCompany(overrides?: Partial<CompanyCardProps>): CompanyCardProps {
  return {
    id: "company-1",
    name: "Acme Corp",
    industry: "Technology",
    size: "50-100",
    domain: "acme.com",
    aiHealthScore: 85,
    contactCount: 12,
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

describe("CompanyCard", () => {
  describe("Rendering", () => {
    it("renders name", () => {
      render(<CompanyCard {...makeCompany()} />);
      expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    });

    it("renders initials (first 2 chars uppercase)", () => {
      render(<CompanyCard {...makeCompany()} />);
      expect(screen.getByText("AC")).toBeInTheDocument();
    });

    it("renders link to /dashboard/companies/{id}", () => {
      render(<CompanyCard {...makeCompany()} />);
      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("href", "/dashboard/companies/company-1");
    });

    it("renders industry when provided", () => {
      render(<CompanyCard {...makeCompany()} />);
      expect(screen.getByText("Technology")).toBeInTheDocument();
    });

    it("renders size when provided", () => {
      render(<CompanyCard {...makeCompany()} />);
      expect(screen.getByText("50-100 emp.")).toBeInTheDocument();
    });

    it("renders domain when provided", () => {
      render(<CompanyCard {...makeCompany()} />);
      expect(screen.getByText("acme.com")).toBeInTheDocument();
    });

    it("renders contactCount when provided", () => {
      render(<CompanyCard {...makeCompany()} />);
      expect(screen.getByText("12")).toBeInTheDocument();
    });

    it("does not render optional fields when null", () => {
      const { container } = render(
        <CompanyCard {...makeCompany({ industry: null, size: null, domain: null, contactCount: undefined })} />
      );
      expect(container.textContent).not.toContain("Technology");
      expect(container.textContent).not.toContain("50-100 emp.");
      expect(container.textContent).not.toContain("acme.com");
    });

    it("shows ScoreBadge with aiHealthScore", () => {
      render(<CompanyCard {...makeCompany()} />);
      const badge = screen.getByTestId("score-badge");
      expect(badge).toHaveTextContent("85");
    });
  });

  describe("Selection", () => {
    it("shows checkbox when selectable=true", () => {
      render(<CompanyCard {...makeCompany({ selectable: true })} />);
      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    it("does not show checkbox when selectable is false (default)", () => {
      render(<CompanyCard {...makeCompany({ selectable: false })} />);
      expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    });

    it("calls onSelectToggle with id when checkbox clicked", () => {
      const onSelectToggle = vi.fn();
      const { container } = render(
        <CompanyCard {...makeCompany({ selectable: true, onSelectToggle })} />
      );

      const checkbox = container.querySelector('button[role="checkbox"]') as HTMLElement;
      expect(checkbox).toBeTruthy();
      fireEvent.click(checkbox);

      expect(onSelectToggle).toHaveBeenCalledWith("company-1");
      expect(onSelectToggle).toHaveBeenCalledTimes(1);
    });

    it("applies ring class when selected=true", () => {
      const { container } = render(
        <CompanyCard {...makeCompany({ selectable: true, selected: true })} />
      );

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass("ring-2", "ring-primary/40");
    });
  });
});
