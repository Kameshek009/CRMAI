import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { TaskItem } from "@/components/crm/task-item";

// Mock Badge
vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <span {...props}>{children}</span>,
}));

// Mock Button
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <button {...props}>{children}</button>,
}));

// Mock Checkbox
vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({ checked, onCheckedChange, ...props }: { checked?: boolean; onCheckedChange?: (v: boolean) => void; [key: string]: unknown }) => (
    <button role="checkbox" aria-checked={!!checked} onClick={() => onCheckedChange?.(!checked)} {...props} />
  ),
}));

interface TaskItemProps {
  id: string;
  title: string;
  type: string;
  priority: string;
  status: string;
  dueDate?: string | null;
  isAiGenerated: boolean;
  onToggle?: (id: string, done: boolean) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  selectable?: boolean;
  selected?: boolean;
  onSelectToggle?: (id: string) => void;
}

function makeTask(overrides?: Partial<TaskItemProps>): TaskItemProps {
  return {
    id: "task-1",
    title: "Follow up with client",
    type: "follow_up",
    priority: "high",
    status: "todo",
    dueDate: null,
    isAiGenerated: false,
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

describe("TaskItem", () => {
  describe("Rendering", () => {
    it("renders title", () => {
      render(<TaskItem {...makeTask()} />);
      expect(screen.getByText("Follow up with client")).toBeInTheDocument();
    });

    it("renders priority badge text", () => {
      render(<TaskItem {...makeTask()} />);
      expect(screen.getByText("high")).toBeInTheDocument();
    });

    it("renders type with _ replaced by space", () => {
      render(<TaskItem {...makeTask()} />);
      expect(screen.getByText("follow up")).toBeInTheDocument();
    });

    it("shows 'In Progress' badge when status='in_progress'", () => {
      render(<TaskItem {...makeTask({ status: "in_progress" })} />);
      expect(screen.getByText("In Progress")).toBeInTheDocument();
    });

    it("applies line-through style when status='done'", () => {
      render(<TaskItem {...makeTask({ status: "done" })} />);
      const title = screen.getByText("Follow up with client");
      expect(title).toHaveClass("line-through");
    });

    it("shows overdue indicator when dueDate is past and not done", () => {
      render(<TaskItem {...makeTask({ dueDate: "2020-01-01", status: "todo" })} />);
      expect(screen.getByText("overdue")).toBeInTheDocument();
    });

    it("shows formatted date when dueDate provided", () => {
      render(<TaskItem {...makeTask({ dueDate: "2025-06-15" })} />);
      expect(screen.getByText("Jun 15")).toBeInTheDocument();
    });

    it("shows AI sparkle icon when isAiGenerated=true", () => {
      const { container } = render(<TaskItem {...makeTask({ isAiGenerated: true })} />);
      const sparkle = container.querySelector(".animate-pulse-glow");
      expect(sparkle).toBeInTheDocument();
    });
  });

  describe("Actions", () => {
    it("edit button is visible and calls onEdit(id) when clicked", () => {
      const onEdit = vi.fn();
      render(<TaskItem {...makeTask({ onEdit })} />);
      const editBtn = screen.getByLabelText("Edit task");
      fireEvent.click(editBtn);
      expect(onEdit).toHaveBeenCalledWith("task-1");
      expect(onEdit).toHaveBeenCalledTimes(1);
    });

    it("delete button is visible and calls onDelete(id) when clicked", () => {
      const onDelete = vi.fn();
      render(<TaskItem {...makeTask({ onDelete })} />);
      const deleteBtn = screen.getByLabelText("Delete task");
      fireEvent.click(deleteBtn);
      expect(onDelete).toHaveBeenCalledWith("task-1");
      expect(onDelete).toHaveBeenCalledTimes(1);
    });
  });

  describe("Selection mode", () => {
    it("shows select checkbox when selectable=true", () => {
      render(<TaskItem {...makeTask({ selectable: true })} />);
      const checkbox = screen.getByLabelText("Select task: Follow up with client");
      expect(checkbox).toBeInTheDocument();
    });

    it("calls onSelectToggle with id when select checkbox clicked", () => {
      const onSelectToggle = vi.fn();
      render(
        <TaskItem {...makeTask({ selectable: true, onSelectToggle })} />
      );
      const checkbox = screen.getByLabelText("Select task: Follow up with client");
      fireEvent.click(checkbox);
      expect(onSelectToggle).toHaveBeenCalledWith("task-1");
      expect(onSelectToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe("Status checkbox (non-select mode)", () => {
    it("calls onToggle when checkbox clicked and not in select mode", () => {
      const onToggle = vi.fn();
      const { container } = render(
        <TaskItem {...makeTask({ onToggle, selectable: false })} />
      );
      const checkbox = container.querySelector('button[role="checkbox"]') as HTMLElement;
      expect(checkbox).toBeTruthy();
      fireEvent.click(checkbox);
      expect(onToggle).toHaveBeenCalledWith("task-1", true);
      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it("checkbox is checked when status='done'", () => {
      const { container } = render(
        <TaskItem {...makeTask({ status: "done" })} />
      );
      const checkbox = container.querySelector('button[role="checkbox"]') as HTMLElement;
      expect(checkbox).toHaveAttribute("aria-checked", "true");
    });
  });
});
