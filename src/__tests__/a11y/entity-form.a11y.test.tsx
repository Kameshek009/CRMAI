import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { EntityForm } from "@/components/crm/entity-form";
import type { FormField } from "@/components/crm/entity-form";

// Mock i18n
vi.mock("@/lib/i18n", () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        "crm.entityForm.required": `${params?.field} is required`,
        "crm.entityForm.invalidEmail": "Invalid email",
        "crm.entityForm.phoneTooLong": "Phone too long",
        "crm.entityForm.cancel": "Cancel",
        "crm.entityForm.create": "Create",
        "crm.entityForm.yes": "Yes",
        "crm.entityForm.no": "No",
        "crm.entityForm.select": "Select...",
        "crm.entityForm.validationErrors": `${params?.count} validation errors`,
      };
      return translations[key] || key;
    },
    locale: "en",
  }),
}));

// Mock Dialog to render children directly
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div role="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock UI components
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: (props: Record<string, unknown>) => <textarea {...props} />,
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: ({ id, checked, onCheckedChange }: { id: string; checked: boolean; onCheckedChange: (v: boolean) => void }) => (
    <button id={id} role="switch" aria-checked={checked} onClick={() => onCheckedChange(!checked)} />
  ),
}));

afterEach(() => { cleanup(); });

const testFields: FormField[] = [
  { name: "first_name", label: "First Name", type: "text", required: true },
  { name: "email", label: "Email", type: "email", required: true },
  { name: "notes", label: "Notes", type: "textarea" },
];

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  title: "Add Contact",
  fields: testFields,
  onSubmit: vi.fn().mockResolvedValue(undefined),
};

describe("EntityForm a11y", () => {
  it("all form fields have associated labels via htmlFor/id", () => {
    render(<EntityForm {...defaultProps} />);
    for (const field of testFields) {
      const input = document.getElementById(`entity-form-${field.name}`);
      expect(input).toBeTruthy();
      const label = document.querySelector(`label[for="entity-form-${field.name}"]`);
      expect(label).toBeTruthy();
    }
  });

  it("required fields are marked with asterisk", () => {
    render(<EntityForm {...defaultProps} />);
    const requiredFields = testFields.filter((f) => f.required);
    for (const field of requiredFields) {
      const label = document.querySelector(`label[for="entity-form-${field.name}"]`);
      expect(label?.textContent).toContain("*");
    }
  });

  it("sets aria-invalid and aria-describedby on fields with errors", () => {
    render(<EntityForm {...defaultProps} />);
    // Submit to trigger validation
    const form = document.querySelector("form")!;
    fireEvent.submit(form);
    // Required fields should show errors
    const nameInput = document.getElementById("entity-form-first_name")!;
    expect(nameInput.getAttribute("aria-invalid")).toBe("true");
    expect(nameInput.getAttribute("aria-describedby")).toBe("entity-form-first_name-error");

    // Error message should exist with role="alert"
    const errorMsg = document.getElementById("entity-form-first_name-error");
    expect(errorMsg).toBeTruthy();
    expect(errorMsg?.getAttribute("role")).toBe("alert");
  });

  it("has aria-live region for validation error announcements", () => {
    render(<EntityForm {...defaultProps} />);
    const liveRegion = document.querySelector('[aria-live="assertive"]');
    expect(liveRegion).toBeTruthy();
    expect(liveRegion?.getAttribute("aria-atomic")).toBe("true");
  });

  it("announces validation error count after submit", () => {
    render(<EntityForm {...defaultProps} />);
    const form = document.querySelector("form")!;
    fireEvent.submit(form);
    const liveRegion = document.querySelector('[aria-live="assertive"]');
    expect(liveRegion?.textContent).toContain("validation errors");
  });

  it("dialog renders with role='dialog'", () => {
    render(<EntityForm {...defaultProps} />);
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});
