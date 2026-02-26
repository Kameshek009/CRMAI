import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { EmptyState } from "@/components/crm/empty-state";
import { Search } from "lucide-react";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>,
    h3: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <h3 {...props}>{children}</h3>,
    p: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <p {...props}>{children}</p>,
  },
}));

// Mock Button
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <button {...props}>{children}</button>,
}));

afterEach(() => {
  cleanup();
});

describe("EmptyState", () => {
  it("renders title", () => {
    render(
      <EmptyState icon={Search} title="No results" description="Try a different search." />
    );
    expect(screen.getByText("No results")).toBeInTheDocument();
  });

  it("renders description", () => {
    render(
      <EmptyState icon={Search} title="No results" description="Try a different search." />
    );
    expect(screen.getByText("Try a different search.")).toBeInTheDocument();
  });

  it("renders action button when actionLabel and onAction provided", () => {
    const onAction = vi.fn();
    render(
      <EmptyState
        icon={Search}
        title="No results"
        description="Try a different search."
        actionLabel="Create New"
        onAction={onAction}
      />
    );
    expect(screen.getByText("Create New")).toBeInTheDocument();
  });

  it("calls onAction when button clicked", () => {
    const onAction = vi.fn();
    render(
      <EmptyState
        icon={Search}
        title="No results"
        description="Try a different search."
        actionLabel="Create New"
        onAction={onAction}
      />
    );
    fireEvent.click(screen.getByText("Create New"));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("does not render button when no actionLabel", () => {
    render(
      <EmptyState icon={Search} title="No results" description="Try a different search." />
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("does not render button when actionLabel but no onAction", () => {
    render(
      <EmptyState
        icon={Search}
        title="No results"
        description="Try a different search."
        actionLabel="Create New"
      />
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
