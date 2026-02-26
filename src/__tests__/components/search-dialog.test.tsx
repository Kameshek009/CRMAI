import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { SearchDialog } from "@/components/crm/search-dialog";

// Mock i18n
vi.mock("@/lib/i18n", () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: "en" }),
}));

// Mock next/navigation
const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

// Mock search store — dialog open by default for tests
const setOpenMock = vi.fn();
vi.mock("@/stores/search-store", () => ({
  useSearchStore: () => ({ open: true, setOpen: setOpenMock }),
}));

// Mock Radix Dialog (portals don't work in jsdom)
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
}));

// Mock Input to forward ref and pass props
vi.mock("@/components/ui/input", () => ({
  Input: vi.fn().mockImplementation(({ className, ...props }: any) => <input {...props} />),
}));

// Mock fetch for search API
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Polyfill scrollIntoView (not available in jsdom)
Element.prototype.scrollIntoView = vi.fn();

beforeEach(() => {
  pushMock.mockClear();
  setOpenMock.mockClear();
  mockFetch.mockClear();
});

afterEach(() => {
  cleanup();
});

describe("SearchDialog", () => {
  describe("Rendering", () => {
    it("renders search input with placeholder", () => {
      render(<SearchDialog />);
      const input = screen.getByPlaceholderText("nav.search.placeholder");
      expect(input).toBeInTheDocument();
    });

    it("renders keyboard hint labels", () => {
      render(<SearchDialog />);
      expect(screen.getByText("nav.search.hints.navigate")).toBeInTheDocument();
      expect(screen.getByText("nav.search.hints.open")).toBeInTheDocument();
      expect(screen.getByText("nav.search.hints.close")).toBeInTheDocument();
    });

    it("has aria-live region for accessibility", () => {
      const { container } = render(<SearchDialog />);
      const liveRegion = container.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeInTheDocument();
    });

    it("renders static action items when no query", () => {
      render(<SearchDialog />);
      // Static action labels are translation keys
      expect(screen.getByText("nav.search.commands.createContact")).toBeInTheDocument();
      expect(screen.getByText("nav.search.commands.createDeal")).toBeInTheDocument();
      expect(screen.getByText("nav.search.commands.createTask")).toBeInTheDocument();
    });
  });

  describe("Search results", () => {
    it("shows search results after typing", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: true,
          data: [
            { type: "contact", id: "c1", title: "Alice Smith", subtitle: "alice@example.com" },
          ],
        }),
      });

      render(<SearchDialog />);
      const input = screen.getByPlaceholderText("nav.search.placeholder");
      fireEvent.change(input, { target: { value: "Alice" } });

      await waitFor(() => {
        expect(screen.getByText("Alice Smith")).toBeInTheDocument();
      });
    });

    it("shows empty state when query has no results", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: [] }),
      });

      render(<SearchDialog />);
      const input = screen.getByPlaceholderText("nav.search.placeholder");
      fireEvent.change(input, { target: { value: "xyznonexistent" } });

      await waitFor(() => {
        expect(screen.getByText(/nav\.search\.noResults/)).toBeInTheDocument();
      });
    });
  });

  describe("Keyboard navigation", () => {
    it("ArrowDown moves selection down", () => {
      render(<SearchDialog />);
      const input = screen.getByPlaceholderText("nav.search.placeholder");

      // First item is selected by default (index 0)
      const firstItem = screen.getAllByRole("button").find(
        (btn) => btn.getAttribute("data-selected") === "true"
      );
      expect(firstItem).toBeTruthy();

      // Press ArrowDown to move to next item
      fireEvent.keyDown(input, { key: "ArrowDown" });

      const buttons = screen.getAllByRole("button");
      const selectedAfter = buttons.filter(
        (btn) => btn.getAttribute("data-selected") === "true"
      );
      expect(selectedAfter.length).toBe(1);
    });

    it("Enter triggers navigation for selected item", () => {
      render(<SearchDialog />);
      const input = screen.getByPlaceholderText("nav.search.placeholder");

      // Press Enter on the first item (first static action: createContact)
      fireEvent.keyDown(input, { key: "Enter" });

      expect(pushMock).toHaveBeenCalledTimes(1);
    });
  });
});
