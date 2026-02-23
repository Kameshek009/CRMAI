import { describe, it, expect } from "vitest";
import { createContactSchema, createDealSchema, createCompanySchema } from "@/lib/crm/validation";

describe("createContactSchema", () => {
  it("accepts valid contact data", () => {
    const result = createContactSchema.safeParse({
      first_name: "Alice",
      email: "alice@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("requires first_name", () => {
    const result = createContactSchema.safeParse({
      email: "alice@example.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty first_name", () => {
    const result = createContactSchema.safeParse({
      first_name: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty email string", () => {
    const result = createContactSchema.safeParse({
      first_name: "Alice",
      email: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = createContactSchema.safeParse({
      first_name: "Alice",
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid status values", () => {
    for (const status of ["lead", "active", "inactive", "churned"]) {
      const result = createContactSchema.safeParse({
        first_name: "Bob",
        status,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid status", () => {
    const result = createContactSchema.safeParse({
      first_name: "Bob",
      status: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("limits tags to 20 items", () => {
    const result = createContactSchema.safeParse({
      first_name: "Alice",
      tags: Array.from({ length: 21 }, (_, i) => `tag${i}`),
    });
    expect(result.success).toBe(false);
  });
});

describe("createDealSchema", () => {
  const validDeal = {
    title: "Big Deal",
    stage_id: "123e4567-e89b-12d3-a456-426614174000",
  };

  it("accepts valid deal data", () => {
    const result = createDealSchema.safeParse(validDeal);
    expect(result.success).toBe(true);
  });

  it("requires title", () => {
    const result = createDealSchema.safeParse({
      stage_id: "123e4567-e89b-12d3-a456-426614174000",
    });
    expect(result.success).toBe(false);
  });

  it("requires stage_id", () => {
    const result = createDealSchema.safeParse({
      title: "Big Deal",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-uuid stage_id", () => {
    const result = createDealSchema.safeParse({
      title: "Big Deal",
      stage_id: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative value", () => {
    const result = createDealSchema.safeParse({
      ...validDeal,
      value: -100,
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional fields", () => {
    const result = createDealSchema.safeParse({
      ...validDeal,
      value: 50000,
      contact_id: "123e4567-e89b-12d3-a456-426614174001",
      description: "A big opportunity",
    });
    expect(result.success).toBe(true);
  });
});

describe("createCompanySchema", () => {
  it("accepts valid company data", () => {
    const result = createCompanySchema.safeParse({ name: "Acme Corp" });
    expect(result.success).toBe(true);
  });

  it("requires name", () => {
    const result = createCompanySchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = createCompanySchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("accepts optional fields", () => {
    const result = createCompanySchema.safeParse({
      name: "Acme",
      domain: "acme.com",
      industry: "Tech",
      email: "info@acme.com",
    });
    expect(result.success).toBe(true);
  });
});
