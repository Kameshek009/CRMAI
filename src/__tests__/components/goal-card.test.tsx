import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { GoalCard } from "@/components/goals/goal-card";

// Mock i18n
vi.mock("@/lib/i18n", () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: "en" }),
}));

// Mock Badge
vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, className, ...props }: any) => <span className={className} {...props}>{children}</span>,
}));

// Mock Button
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

interface Goal {
  id: string;
  account_id: string | null;
  type: string;
  target_value: number;
  period: string;
  start_date: string;
  end_date: string;
}

interface GoalProgress {
  goal_id: string;
  current_value: number;
  target_value: number;
  percentage: number;
  status: "on_track" | "at_risk" | "behind";
}

function makeGoal(overrides?: Partial<Goal>): Goal {
  return {
    id: "goal-1",
    account_id: null,
    type: "revenue",
    target_value: 50000,
    period: "monthly",
    start_date: "2026-01-01",
    end_date: "2026-01-31",
    ...overrides,
  };
}

function makeProgress(overrides?: Partial<GoalProgress>): GoalProgress {
  return {
    goal_id: "goal-1",
    current_value: 25000,
    target_value: 50000,
    percentage: 50,
    status: "on_track",
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

describe("GoalCard", () => {
  describe("Rendering", () => {
    it("renders goal type as title from translation key", () => {
      render(<GoalCard goal={makeGoal()} progress={makeProgress()} onDelete={vi.fn()} />);
      expect(screen.getByText("crm.goals.types.revenue")).toBeInTheDocument();
    });

    it("renders current value formatted for revenue type", () => {
      render(
        <GoalCard
          goal={makeGoal({ type: "revenue", target_value: 50000 })}
          progress={makeProgress({ current_value: 25000 })}
          onDelete={vi.fn()}
        />
      );
      // 25000 → $25.0k
      expect(screen.getByText("$25.0k")).toBeInTheDocument();
    });

    it("renders target value formatted for revenue type", () => {
      render(
        <GoalCard
          goal={makeGoal({ type: "revenue", target_value: 50000 })}
          progress={makeProgress()}
          onDelete={vi.fn()}
        />
      );
      // target: 50000 → / $50.0k
      expect(screen.getByText("/ $50.0k")).toBeInTheDocument();
    });

    it("renders numeric values for non-revenue types", () => {
      render(
        <GoalCard
          goal={makeGoal({ type: "deals_won", target_value: 20 })}
          progress={makeProgress({ current_value: 8, target_value: 20 })}
          onDelete={vi.fn()}
        />
      );
      expect(screen.getByText("8")).toBeInTheDocument();
      expect(screen.getByText("/ 20")).toBeInTheDocument();
    });

    it("renders progress percentage", () => {
      render(
        <GoalCard
          goal={makeGoal()}
          progress={makeProgress({ percentage: 65 })}
          onDelete={vi.fn()}
        />
      );
      expect(screen.getByText("65% crm.goals.complete")).toBeInTheDocument();
    });

    it("renders progress bar with correct width", () => {
      const { container } = render(
        <GoalCard
          goal={makeGoal()}
          progress={makeProgress({ percentage: 42 })}
          onDelete={vi.fn()}
        />
      );
      const progressBar = container.querySelector(".h-full.rounded-full");
      expect(progressBar).toHaveStyle({ width: "42%" });
    });

    it("renders status badge from translation key", () => {
      render(
        <GoalCard
          goal={makeGoal()}
          progress={makeProgress({ status: "at_risk" })}
          onDelete={vi.fn()}
        />
      );
      expect(screen.getByText("crm.goals.statuses.at_risk")).toBeInTheDocument();
    });

    it("shows 'team-wide' label when account_id is null", () => {
      render(
        <GoalCard
          goal={makeGoal({ account_id: null })}
          progress={makeProgress()}
          onDelete={vi.fn()}
        />
      );
      expect(screen.getByText("crm.goals.teamWide")).toBeInTheDocument();
    });

    it("shows 'personal' label when account_id is set", () => {
      render(
        <GoalCard
          goal={makeGoal({ account_id: "acc-1" })}
          progress={makeProgress()}
          onDelete={vi.fn()}
        />
      );
      expect(screen.getByText("crm.goals.personal")).toBeInTheDocument();
    });
  });

  describe("Actions", () => {
    it("calls onDelete when delete button is clicked", () => {
      const onDelete = vi.fn();
      render(<GoalCard goal={makeGoal()} progress={makeProgress()} onDelete={onDelete} />);
      // Find the delete button — it's a button with Trash2 icon
      const buttons = screen.getAllByRole("button");
      const deleteBtn = buttons[buttons.length - 1];
      fireEvent.click(deleteBtn);
      expect(onDelete).toHaveBeenCalledTimes(1);
    });
  });

  describe("Period display", () => {
    it("renders period from translation key", () => {
      render(
        <GoalCard
          goal={makeGoal({ period: "quarterly" })}
          progress={makeProgress()}
          onDelete={vi.fn()}
        />
      );
      expect(screen.getByText("crm.goals.periods.quarterly")).toBeInTheDocument();
    });
  });
});
