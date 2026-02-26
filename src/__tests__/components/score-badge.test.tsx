import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ScoreBadge } from "@/components/crm/score-badge";

afterEach(() => {
  cleanup();
});

describe("ScoreBadge", () => {
  it("renders the score number", () => {
    render(<ScoreBadge score={75} />);
    expect(screen.getByText("75")).toBeInTheDocument();
  });

  it("has role='meter' with correct aria attributes", () => {
    render(<ScoreBadge score={60} />);
    const meter = screen.getByRole("meter");
    expect(meter).toHaveAttribute("aria-valuenow", "60");
    expect(meter).toHaveAttribute("aria-valuemin", "0");
    expect(meter).toHaveAttribute("aria-valuemax", "100");
  });

  it("aria-label includes score and level label", () => {
    render(<ScoreBadge score={50} />);
    const meter = screen.getByRole("meter");
    expect(meter).toHaveAttribute("aria-label", "Score: 50% (Medium)");
  });

  it("high score (>=70): aria-label contains 'High'", () => {
    render(<ScoreBadge score={85} />);
    const meter = screen.getByRole("meter");
    expect(meter.getAttribute("aria-label")).toContain("High");
  });

  it("medium score (40-69): aria-label contains 'Medium'", () => {
    render(<ScoreBadge score={55} />);
    const meter = screen.getByRole("meter");
    expect(meter.getAttribute("aria-label")).toContain("Medium");
  });

  it("low score (<40): aria-label contains 'Low'", () => {
    render(<ScoreBadge score={20} />);
    const meter = screen.getByRole("meter");
    expect(meter.getAttribute("aria-label")).toContain("Low");
  });

  it("custom label is used in aria-label when provided", () => {
    render(<ScoreBadge score={90} label="Health" />);
    const meter = screen.getByRole("meter");
    expect(meter).toHaveAttribute("aria-label", "Health: 90% (High)");
  });

  it("size='md' renders larger dimensions", () => {
    const { container } = render(<ScoreBadge score={50} size="md" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass("w-11", "h-11");
  });

  it("size='sm' (default) renders smaller dimensions", () => {
    const { container } = render(<ScoreBadge score={50} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass("w-9", "h-9");
  });
});
