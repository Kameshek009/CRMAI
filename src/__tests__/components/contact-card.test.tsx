import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ContactCard } from "@/components/crm/contact-card";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

// Mock Radix Tooltip (portals don't work in jsdom)
vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: any) => <>{children}</>,
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children, asChild, ...props }: any) => <span {...props}>{children}</span>,
  TooltipContent: () => null,
}));

// Mock Radix Avatar (image loading unreliable in jsdom)
vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children, className }: any) => <div className={className}>{children}</div>,
  AvatarFallback: ({ children }: any) => <span>{children}</span>,
  AvatarImage: () => null,
}));

interface ContactCardProps {
  id: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  title?: string | null;
  status: string;
  engagementScore: number;
  companyName?: string | null;
  selectable?: boolean;
  selected?: boolean;
  onSelectToggle?: (id: string) => void;
}

function makeContact(overrides?: Partial<ContactCardProps>): ContactCardProps {
  return {
    id: "contact-1",
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    phone: "+1234567890",
    title: "CEO",
    status: "active",
    engagementScore: 75,
    companyName: "Acme Inc",
    ...overrides,
  };
}

describe("ContactCard", () => {
  describe("Rendering", () => {
    it("renders full name (firstName + lastName)", () => {
      const contact = makeContact();
      render(<ContactCard {...contact} />);
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    it("renders firstName only when lastName is null", () => {
      const contact = makeContact({ lastName: null });
      render(<ContactCard {...contact} />);
      expect(screen.getByText("John")).toBeInTheDocument();
    });

    it("renders initials in avatar (e.g. 'JD' for John Doe)", () => {
      const contact = makeContact();
      render(<ContactCard {...contact} />);
      const initials = screen.getAllByText("JD");
      expect(initials.length).toBeGreaterThan(0);
    });

    it("renders single initial when no lastName (e.g. 'J' for John)", () => {
      const contact = makeContact({ lastName: null });
      render(<ContactCard {...contact} />);
      const initials = screen.getAllByText("J");
      expect(initials.length).toBeGreaterThan(0);
    });

    it("renders link to /dashboard/contacts/{id}", () => {
      const contact = makeContact();
      render(<ContactCard {...contact} />);
      const links = screen.getAllByRole("link");
      expect(links[0]).toHaveAttribute("href", "/dashboard/contacts/contact-1");
    });

    it("renders email when provided", () => {
      const contact = makeContact();
      render(<ContactCard {...contact} />);
      const emails = screen.getAllByText("john@example.com");
      expect(emails.length).toBeGreaterThan(0);
    });

    it("renders phone when provided", () => {
      const contact = makeContact();
      render(<ContactCard {...contact} />);
      const phones = screen.getAllByText("+1234567890");
      expect(phones.length).toBeGreaterThan(0);
    });

    it("renders company name when provided", () => {
      const contact = makeContact();
      render(<ContactCard {...contact} />);
      const companies = screen.getAllByText("Acme Inc");
      expect(companies.length).toBeGreaterThan(0);
    });

    it("does not render email/phone/company when null", () => {
      const contact = makeContact({ email: null, phone: null, companyName: null });
      const { container } = render(<ContactCard {...contact} />);
      expect(container.textContent).not.toContain("john@example.com");
      expect(container.textContent).not.toContain("+1234567890");
      expect(container.textContent).not.toContain("Acme Inc");
    });

    it("renders job title when provided", () => {
      const contact = makeContact();
      render(<ContactCard {...contact} />);
      const titles = screen.getAllByText("CEO");
      expect(titles.length).toBeGreaterThan(0);
    });

    it("renders status badge text", () => {
      const contact = makeContact();
      render(<ContactCard {...contact} />);
      const statuses = screen.getAllByText("active");
      expect(statuses.length).toBeGreaterThan(0);
    });
  });

  describe("Selection", () => {
    it("does not show checkbox when selectable=false", () => {
      const contact = makeContact({ selectable: false });
      render(<ContactCard {...contact} />);
      expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    });

    it("shows checkbox when selectable=true", () => {
      const contact = makeContact({ selectable: true });
      render(<ContactCard {...contact} />);
      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    it("calls onSelectToggle with id when checkbox clicked", () => {
      const onSelectToggle = vi.fn();
      const contact = makeContact({ selectable: true, onSelectToggle });
      const { container } = render(<ContactCard {...contact} />);

      // Checkbox is a button with role="checkbox"
      const checkbox = container.querySelector('button[role="checkbox"]') as HTMLElement;
      expect(checkbox).toBeTruthy();
      fireEvent.click(checkbox);

      expect(onSelectToggle).toHaveBeenCalledWith("contact-1");
      expect(onSelectToggle).toHaveBeenCalledTimes(1);
    });

    it("shows selected ring when selected=true", () => {
      const contact = makeContact({ selectable: true, selected: true });
      const { container } = render(<ContactCard {...contact} />);

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass("ring-2", "ring-primary/40");
    });
  });
});
