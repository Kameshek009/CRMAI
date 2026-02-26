import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { SortableNavItem } from "@/components/sidebar/sortable-nav-item";
import { Home, Settings, Users } from "lucide-react";

// Mock i18n — returns the key as label
vi.mock("@/lib/i18n", () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: "en" }),
}));

// Mock dnd-kit sortable
vi.mock("@dnd-kit/sortable", () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}));
vi.mock("@dnd-kit/utilities", () => ({
  CSS: { Transform: { toString: () => "" } },
}));

interface SortableNavItemProps {
  id: string;
  labelKey: string;
  icon: typeof Home;
  visible: boolean;
  onToggleVisibility: () => void;
}

function makeProps(overrides?: Partial<SortableNavItemProps>): SortableNavItemProps {
  return {
    id: "nav-home",
    labelKey: "nav.home",
    icon: Home,
    visible: true,
    onToggleVisibility: vi.fn(),
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

describe("SortableNavItem", () => {
  describe("Rendering", () => {
    it("renders label from translation key", () => {
      render(<SortableNavItem {...makeProps()} />);
      expect(screen.getByText("nav.home")).toBeInTheDocument();
    });

    it("renders the provided icon", () => {
      const { container } = render(<SortableNavItem {...makeProps({ icon: Users })} />);
      // Lucide renders <svg> elements; Users icon should be present
      const svgs = container.querySelectorAll("svg");
      // At least 3 svgs: grip icon, nav icon, eye icon
      expect(svgs.length).toBeGreaterThanOrEqual(3);
    });

    it("renders drag handle with reorder aria-label", () => {
      render(<SortableNavItem {...makeProps()} />);
      const dragHandle = screen.getByLabelText("Reorder nav.home");
      expect(dragHandle).toBeInTheDocument();
    });

    it("shows Eye icon aria-label 'Hide' when visible=true", () => {
      render(<SortableNavItem {...makeProps({ visible: true })} />);
      const toggleBtn = screen.getByLabelText("Hide nav.home");
      expect(toggleBtn).toBeInTheDocument();
    });

    it("shows EyeOff icon aria-label 'Show' when visible=false", () => {
      render(<SortableNavItem {...makeProps({ visible: false })} />);
      const toggleBtn = screen.getByLabelText("Show nav.home");
      expect(toggleBtn).toBeInTheDocument();
    });

    it("applies line-through to label when visible=false", () => {
      render(<SortableNavItem {...makeProps({ visible: false })} />);
      const label = screen.getByText("nav.home");
      expect(label).toHaveClass("line-through");
    });

    it("does not apply line-through when visible=true", () => {
      render(<SortableNavItem {...makeProps({ visible: true })} />);
      const label = screen.getByText("nav.home");
      expect(label).not.toHaveClass("line-through");
    });
  });

  describe("Actions", () => {
    it("calls onToggleVisibility when visibility button is clicked", () => {
      const onToggleVisibility = vi.fn();
      render(<SortableNavItem {...makeProps({ visible: true, onToggleVisibility })} />);
      const toggleBtn = screen.getByLabelText("Hide nav.home");
      fireEvent.click(toggleBtn);
      expect(onToggleVisibility).toHaveBeenCalledTimes(1);
    });
  });
});
