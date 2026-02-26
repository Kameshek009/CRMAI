import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { StageColumn } from "@/components/pipeline/stage-column";
import type { DealForCard } from "@/components/crm/deal-card";

// Mock i18n
vi.mock("@/lib/i18n", () => ({
  useTranslation: () => ({ t: (key: string, params?: Record<string, unknown>) => {
    if (params) return `${key} ${JSON.stringify(params)}`;
    return key;
  }, locale: "en" }),
}));

// Mock dnd-kit
vi.mock("@dnd-kit/core", () => ({
  useDroppable: () => ({ setNodeRef: vi.fn(), isOver: false }),
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

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

// Mock Button
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

// Mock Input
vi.mock("@/components/ui/input", () => ({
  Input: (props: any) => <input {...props} />,
}));

interface StageData {
  id: string;
  name: string;
  color: string;
  position: number;
  is_won: boolean;
  is_lost: boolean;
  rotting_days?: number | null;
}

function makeStage(overrides?: Partial<StageData>): StageData {
  return {
    id: "stage-1",
    name: "Qualification",
    color: "#3b82f6",
    position: 0,
    is_won: false,
    is_lost: false,
    rotting_days: null,
    ...overrides,
  };
}

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

const defaultProps = {
  isOver: false,
  isLast: false,
  onAddDeal: vi.fn(),
  onQuickAdd: vi.fn(),
};

afterEach(() => {
  cleanup();
});

describe("StageColumn", () => {
  describe("Rendering", () => {
    it("renders stage name", () => {
      render(
        <StageColumn
          stage={makeStage()}
          deals={[]}
          totalValue={0}
          count={0}
          {...defaultProps}
        />
      );
      expect(screen.getByText("Qualification")).toBeInTheDocument();
    });

    it("renders deal count", () => {
      render(
        <StageColumn
          stage={makeStage()}
          deals={[makeDeal()]}
          totalValue={10000}
          count={3}
          {...defaultProps}
        />
      );
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("renders total value formatted with dollar sign", () => {
      render(
        <StageColumn
          stage={makeStage()}
          deals={[]}
          totalValue={25000}
          count={2}
          {...defaultProps}
        />
      );
      expect(screen.getByText("$25,000")).toBeInTheDocument();
    });

    it("renders deal cards within the column", () => {
      const deals = [
        makeDeal({ id: "d1", title: "Deal Alpha" }),
        makeDeal({ id: "d2", title: "Deal Beta" }),
      ];
      render(
        <StageColumn
          stage={makeStage()}
          deals={deals}
          totalValue={20000}
          count={2}
          {...defaultProps}
        />
      );
      expect(screen.getByText("Deal Alpha")).toBeInTheDocument();
      expect(screen.getByText("Deal Beta")).toBeInTheDocument();
    });

    it("shows empty state button when no deals", () => {
      render(
        <StageColumn
          stage={makeStage()}
          deals={[]}
          totalValue={0}
          count={0}
          {...defaultProps}
        />
      );
      expect(screen.getByText("crm.pipeline.noDeals")).toBeInTheDocument();
    });

    it("renders rotting days indicator when set", () => {
      render(
        <StageColumn
          stage={makeStage({ rotting_days: 14 })}
          deals={[]}
          totalValue={0}
          count={0}
          {...defaultProps}
        />
      );
      expect(screen.getByText("14d")).toBeInTheDocument();
    });

    it("renders color bar with stage color", () => {
      const { container } = render(
        <StageColumn
          stage={makeStage({ color: "#ef4444" })}
          deals={[]}
          totalValue={0}
          count={0}
          {...defaultProps}
        />
      );
      const colorBar = container.querySelector(".h-1.w-full.rounded-full");
      expect(colorBar).toHaveStyle({ backgroundColor: "#ef4444" });
    });
  });
});
