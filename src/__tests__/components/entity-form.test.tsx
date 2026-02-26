import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { EntityForm } from "@/components/crm/entity-form";
import type { FormField } from "@/components/crm/entity-form";

// Mock Dialog (Radix portals don't work in jsdom)
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

// Mock Switch (Radix primitive)
vi.mock("@/components/ui/switch", () => ({
  Switch: ({ checked, onCheckedChange, ...props }: any) => (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange?.(!checked)}
      {...props}
    />
  ),
}));

// Mock i18n
vi.mock("@/lib/i18n", () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      if (key === "crm.entityForm.required" && params?.field) {
        return `${params.field} is required`;
      }
      if (key === "crm.entityForm.invalidEmail") {
        return "Invalid email format";
      }
      if (key === "crm.entityForm.phoneTooLong") {
        return "Phone number too long";
      }
      return key;
    },
    locale: "en"
  }),
}));

describe("EntityForm", () => {
  const mockOnOpenChange = vi.fn();
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSubmit.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  describe("Rendering", () => {
    it("does not render when open=false", () => {
      render(
        <EntityForm
          open={false}
          onOpenChange={mockOnOpenChange}
          title="Test Form"
          fields={[]}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
    });

    it("renders dialog with title when open=true", () => {
      render(
        <EntityForm
          open={true}
          onOpenChange={mockOnOpenChange}
          title="Test Form Title"
          fields={[]}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByTestId("dialog")).toBeInTheDocument();
      expect(screen.getByText("Test Form Title")).toBeInTheDocument();
    });

    it("renders all field types", () => {
      const fields: FormField[] = [
        { name: "textField", label: "Text Field", type: "text" },
        { name: "emailField", label: "Email Field", type: "email" },
        { name: "telField", label: "Tel Field", type: "tel" },
        { name: "numberField", label: "Number Field", type: "number" },
        { name: "textareaField", label: "Textarea Field", type: "textarea" },
        { name: "selectField", label: "Select Field", type: "select", options: [{ label: "Option 1", value: "opt1" }] },
        { name: "dateField", label: "Date Field", type: "date" },
        { name: "urlField", label: "URL Field", type: "url" },
        { name: "booleanField", label: "Boolean Field", type: "boolean" },
      ];

      render(
        <EntityForm
          open={true}
          onOpenChange={mockOnOpenChange}
          title="All Field Types"
          fields={fields}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByLabelText("Text Field")).toBeInTheDocument();
      expect(screen.getByLabelText("Email Field")).toBeInTheDocument();
      expect(screen.getByLabelText("Tel Field")).toBeInTheDocument();
      expect(screen.getByLabelText("Number Field")).toBeInTheDocument();
      expect(screen.getByLabelText("Textarea Field")).toBeInTheDocument();
      expect(screen.getByLabelText("Select Field")).toBeInTheDocument();
      expect(screen.getByLabelText("Date Field")).toBeInTheDocument();
      expect(screen.getByLabelText("URL Field")).toBeInTheDocument();
      expect(screen.getByLabelText("Boolean Field")).toBeInTheDocument();
    });

    it("renders required indicator (*) for required fields", () => {
      const fields: FormField[] = [
        { name: "requiredField", label: "Required Field", type: "text", required: true },
        { name: "optionalField", label: "Optional Field", type: "text", required: false },
      ];

      const { container } = render(
        <EntityForm
          open={true}
          onOpenChange={mockOnOpenChange}
          title="Required Fields"
          fields={fields}
          onSubmit={mockOnSubmit}
        />
      );

      const requiredLabel = container.querySelector('label[for="entity-form-requiredField"]');
      const optionalLabel = container.querySelector('label[for="entity-form-optionalField"]');

      expect(requiredLabel?.textContent).toContain("*");
      expect(optionalLabel?.textContent).not.toContain("*");
    });

    it("renders submit button with custom submitLabel", () => {
      render(
        <EntityForm
          open={true}
          onOpenChange={mockOnOpenChange}
          title="Custom Submit"
          fields={[]}
          onSubmit={mockOnSubmit}
          submitLabel="Save Changes"
        />
      );

      expect(screen.getByRole("button", { name: /Save Changes/i })).toBeInTheDocument();
    });
  });

  describe("Validation", () => {
    it("shows error on blur for required empty field", async () => {
      const fields: FormField[] = [
        { name: "email", label: "Email", type: "email", required: true },
      ];

      const { container } = render(
        <EntityForm
          open={true}
          onOpenChange={mockOnOpenChange}
          title="Validation Test"
          fields={fields}
          onSubmit={mockOnSubmit}
        />
      );

      const input = container.querySelector("#entity-form-email") as HTMLInputElement;
      fireEvent.blur(input);

      await waitFor(() => {
        expect(screen.getByText("Email is required")).toBeInTheDocument();
      });
    });

    it("shows error for invalid email format", async () => {
      const fields: FormField[] = [
        { name: "email", label: "Email", type: "email", required: false },
      ];

      render(
        <EntityForm
          open={true}
          onOpenChange={mockOnOpenChange}
          title="Email Validation"
          fields={fields}
          onSubmit={mockOnSubmit}
        />
      );

      const input = screen.getByLabelText("Email");
      fireEvent.change(input, { target: { value: "invalid-email" } });
      fireEvent.blur(input);

      await waitFor(() => {
        expect(screen.getByText("Invalid email format")).toBeInTheDocument();
      });
    });

    it("shows error for phone > 20 characters", async () => {
      const fields: FormField[] = [
        { name: "phone", label: "Phone", type: "tel", required: false },
      ];

      render(
        <EntityForm
          open={true}
          onOpenChange={mockOnOpenChange}
          title="Phone Validation"
          fields={fields}
          onSubmit={mockOnSubmit}
        />
      );

      const input = screen.getByLabelText("Phone");
      fireEvent.change(input, { target: { value: "123456789012345678901" } }); // 21 chars
      fireEvent.blur(input);

      await waitFor(() => {
        expect(screen.getByText("Phone number too long")).toBeInTheDocument();
      });
    });

    it("does NOT show error for valid inputs", async () => {
      const fields: FormField[] = [
        { name: "email", label: "Email", type: "email", required: true },
        { name: "phone", label: "Phone", type: "tel", required: false },
      ];

      const { container } = render(
        <EntityForm
          open={true}
          onOpenChange={mockOnOpenChange}
          title="Valid Inputs"
          fields={fields}
          onSubmit={mockOnSubmit}
        />
      );

      const emailInput = container.querySelector("#entity-form-email") as HTMLInputElement;
      fireEvent.change(emailInput, { target: { value: "valid@email.com" } });
      fireEvent.blur(emailInput);

      const phoneInput = container.querySelector("#entity-form-phone") as HTMLInputElement;
      fireEvent.change(phoneInput, { target: { value: "+1234567890" } }); // 11 chars
      fireEvent.blur(phoneInput);

      await waitFor(() => {
        expect(screen.queryByText(/is required/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Invalid email/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/too long/i)).not.toBeInTheDocument();
      });
    });
  });

  describe("Form submission", () => {
    it("calls onSubmit with form values on valid submit", async () => {
      const fields: FormField[] = [
        { name: "name", label: "Name", type: "text", required: true },
        { name: "email", label: "Email", type: "email", required: true },
      ];

      const { container } = render(
        <EntityForm
          open={true}
          onOpenChange={mockOnOpenChange}
          title="Submit Test"
          fields={fields}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = container.querySelector("#entity-form-name") as HTMLInputElement;
      const emailInput = container.querySelector("#entity-form-email") as HTMLInputElement;

      fireEvent.change(nameInput, { target: { value: "John Doe" } });
      fireEvent.change(emailInput, { target: { value: "john@example.com" } });

      const form = container.querySelector("form")!;
      fireEvent.submit(form);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: "John Doe",
          email: "john@example.com",
        });
      });
    });

    it("does NOT call onSubmit when validation fails", async () => {
      const fields: FormField[] = [
        { name: "email", label: "Email", type: "email", required: true },
      ];

      const { container } = render(
        <EntityForm
          open={true}
          onOpenChange={mockOnOpenChange}
          title="Validation Fail Test"
          fields={fields}
          onSubmit={mockOnSubmit}
        />
      );

      const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Email is required")).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it("separates metadata.* keys into nested metadata JSON", async () => {
      const fields: FormField[] = [
        { name: "name", label: "Name", type: "text", required: true },
        { name: "metadata.customField", label: "Custom Field", type: "text", required: false },
        { name: "metadata.anotherField", label: "Another Field", type: "text", required: false },
      ];

      const { container } = render(
        <EntityForm
          open={true}
          onOpenChange={mockOnOpenChange}
          title="Metadata Test"
          fields={fields}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = container.querySelector("#entity-form-name") as HTMLInputElement;
      const customFieldInput = container.querySelector("#entity-form-metadata\\.customField") as HTMLInputElement;
      const anotherFieldInput = container.querySelector("#entity-form-metadata\\.anotherField") as HTMLInputElement;

      fireEvent.change(nameInput, { target: { value: "Test Name" } });
      fireEvent.change(customFieldInput, { target: { value: "Custom Value" } });
      fireEvent.change(anotherFieldInput, { target: { value: "Another Value" } });

      const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: "Test Name",
          metadata: JSON.stringify({
            customField: "Custom Value",
            anotherField: "Another Value",
          }),
        });
      });
    });

    it("shows loading state during submission", async () => {
      const slowSubmit = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      const fields: FormField[] = [
        { name: "name", label: "Name", type: "text", required: true },
      ];

      const { container } = render(
        <EntityForm
          open={true}
          onOpenChange={mockOnOpenChange}
          title="Loading Test"
          fields={fields}
          onSubmit={slowSubmit}
        />
      );

      const nameInput = container.querySelector("#entity-form-name") as HTMLInputElement;
      fireEvent.change(nameInput, { target: { value: "Test" } });

      const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });

      await waitFor(() => {
        expect(slowSubmit).toHaveBeenCalled();
      }, { timeout: 200 });
    });
  });

  describe("Initial values", () => {
    it("populates fields with initialValues", () => {
      const fields: FormField[] = [
        { name: "name", label: "Name", type: "text" },
        { name: "email", label: "Email", type: "email" },
      ];

      // First render with open=false, then rerender with open=true to trigger the effect
      const { rerender, container } = render(
        <EntityForm
          open={false}
          onOpenChange={mockOnOpenChange}
          title="Initial Values"
          fields={fields}
          initialValues={{ name: "John", email: "john@test.com" }}
          onSubmit={mockOnSubmit}
        />
      );

      rerender(
        <EntityForm
          open={true}
          onOpenChange={mockOnOpenChange}
          title="Initial Values"
          fields={fields}
          initialValues={{ name: "John", email: "john@test.com" }}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = container.querySelector("#entity-form-name") as HTMLInputElement;
      const emailInput = container.querySelector("#entity-form-email") as HTMLInputElement;

      expect(nameInput.value).toBe("John");
      expect(emailInput.value).toBe("john@test.com");
    });

    it("resets form when dialog reopens", async () => {
      const fields: FormField[] = [
        { name: "name", label: "Name", type: "text" },
      ];

      // Start with closed dialog
      const { rerender, container } = render(
        <EntityForm
          open={false}
          onOpenChange={mockOnOpenChange}
          title="Reset Test"
          fields={fields}
          initialValues={{ name: "Initial" }}
          onSubmit={mockOnSubmit}
        />
      );

      // Open dialog
      rerender(
        <EntityForm
          open={true}
          onOpenChange={mockOnOpenChange}
          title="Reset Test"
          fields={fields}
          initialValues={{ name: "Initial" }}
          onSubmit={mockOnSubmit}
        />
      );

      let nameInput = container.querySelector("#entity-form-name") as HTMLInputElement;
      expect(nameInput.value).toBe("Initial");

      // User changes the value
      fireEvent.change(nameInput, { target: { value: "Changed" } });
      expect(nameInput.value).toBe("Changed");

      // Close dialog
      rerender(
        <EntityForm
          open={false}
          onOpenChange={mockOnOpenChange}
          title="Reset Test"
          fields={fields}
          initialValues={{ name: "Initial" }}
          onSubmit={mockOnSubmit}
        />
      );

      // Reopen dialog
      rerender(
        <EntityForm
          open={true}
          onOpenChange={mockOnOpenChange}
          title="Reset Test"
          fields={fields}
          initialValues={{ name: "Initial" }}
          onSubmit={mockOnSubmit}
        />
      );

      nameInput = container.querySelector("#entity-form-name") as HTMLInputElement;
      expect(nameInput.value).toBe("Initial");
    });
  });
});
