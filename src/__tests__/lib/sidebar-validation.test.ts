import { describe, it, expect } from "vitest";
import { sidebarConfigSchema } from "../../lib/validations/sidebar";

describe("sidebarConfigSchema", () => {
  it("should accept valid config with 2 groups (crm + tools)", () => {
    const validConfig = [
      {
        groupKey: "crm",
        items: [
          { key: "contacts", visible: true },
          { key: "companies", visible: false },
        ],
      },
      {
        groupKey: "tools",
        items: [
          { key: "calendar", visible: true },
        ],
      },
    ];

    const result = sidebarConfigSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
  });

  it("should reject config with 1 group", () => {
    const configWith1Group = [
      {
        groupKey: "crm",
        items: [{ key: "contacts", visible: true }],
      },
    ];

    const result = sidebarConfigSchema.safeParse(configWith1Group);
    expect(result.success).toBe(false);
  });

  it("should reject config with 3 groups", () => {
    const configWith3Groups = [
      {
        groupKey: "crm",
        items: [{ key: "contacts", visible: true }],
      },
      {
        groupKey: "tools",
        items: [{ key: "calendar", visible: true }],
      },
      {
        groupKey: "crm",
        items: [{ key: "extra", visible: true }],
      },
    ];

    const result = sidebarConfigSchema.safeParse(configWith3Groups);
    expect(result.success).toBe(false);
  });

  it("should reject config with invalid groupKey", () => {
    const configWithInvalidKey = [
      {
        groupKey: "invalid",
        items: [{ key: "contacts", visible: true }],
      },
      {
        groupKey: "tools",
        items: [{ key: "calendar", visible: true }],
      },
    ];

    const result = sidebarConfigSchema.safeParse(configWithInvalidKey);
    expect(result.success).toBe(false);
  });

  it("should reject group with empty items array", () => {
    const configWithEmptyItems = [
      {
        groupKey: "crm",
        items: [],
      },
      {
        groupKey: "tools",
        items: [{ key: "calendar", visible: true }],
      },
    ];

    const result = sidebarConfigSchema.safeParse(configWithEmptyItems);
    expect(result.success).toBe(false);
  });

  it("should reject group with more than 20 items", () => {
    const tooManyItems = Array.from({ length: 21 }, (_, i) => ({
      key: `item${i}`,
      visible: true,
    }));

    const configWithTooManyItems = [
      {
        groupKey: "crm",
        items: tooManyItems,
      },
      {
        groupKey: "tools",
        items: [{ key: "calendar", visible: true }],
      },
    ];

    const result = sidebarConfigSchema.safeParse(configWithTooManyItems);
    expect(result.success).toBe(false);
  });

  it("should reject item missing key or visible property", () => {
    const configWithMissingKey = [
      {
        groupKey: "crm",
        items: [{ visible: true }],
      },
      {
        groupKey: "tools",
        items: [{ key: "calendar", visible: true }],
      },
    ];

    const resultMissingKey = sidebarConfigSchema.safeParse(configWithMissingKey);
    expect(resultMissingKey.success).toBe(false);

    const configWithMissingVisible = [
      {
        groupKey: "crm",
        items: [{ key: "contacts" }],
      },
      {
        groupKey: "tools",
        items: [{ key: "calendar", visible: true }],
      },
    ];

    const resultMissingVisible = sidebarConfigSchema.safeParse(configWithMissingVisible);
    expect(resultMissingVisible.success).toBe(false);
  });

  it("should reject item key exceeding 50 characters", () => {
    const longKey = "a".repeat(51);
    const configWithLongKey = [
      {
        groupKey: "crm",
        items: [{ key: longKey, visible: true }],
      },
      {
        groupKey: "tools",
        items: [{ key: "calendar", visible: true }],
      },
    ];

    const result = sidebarConfigSchema.safeParse(configWithLongKey);
    expect(result.success).toBe(false);
  });
});
