import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const LOCALES_DIR = path.resolve(__dirname, "../../locales");
const NAMESPACES = [
  "billing",
  "chat",
  "common",
  "crm",
  "fields",
  "landing",
  "nav",
  "notes",
  "settings",
  "team",
];

/**
 * Recursively extracts all leaf keys from an object using dot notation
 * @param obj - Object to extract keys from
 * @param prefix - Current key prefix
 * @returns Array of dot-notated keys
 */
function extractKeys(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) {
    return [prefix];
  }

  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const newPrefix = prefix ? `${prefix}.${key}` : key;
    keys.push(...extractKeys(value, newPrefix));
  }

  return keys;
}

/**
 * Recursively extracts all leaf values from an object
 * @param obj - Object to extract values from
 * @returns Array of leaf values
 */
function extractValues(obj: unknown): string[] {
  if (typeof obj !== "object" || obj === null) {
    return [String(obj)];
  }

  const values: string[] = [];
  for (const value of Object.values(obj)) {
    values.push(...extractValues(value));
  }

  return values;
}

describe("i18n completeness", () => {
  NAMESPACES.forEach((namespace) => {
    it(`should have matching keys in EN and RU for ${namespace}`, () => {
      const enPath = path.join(LOCALES_DIR, "en", `${namespace}.json`);
      const ruPath = path.join(LOCALES_DIR, "ru", `${namespace}.json`);

      const enContent = JSON.parse(fs.readFileSync(enPath, "utf-8"));
      const ruContent = JSON.parse(fs.readFileSync(ruPath, "utf-8"));

      const enKeys = extractKeys(enContent).sort();
      const ruKeys = extractKeys(ruContent).sort();

      expect(enKeys).toEqual(ruKeys);
    });
  });

  it("should not have empty string values in EN translations", () => {
    NAMESPACES.forEach((namespace) => {
      const enPath = path.join(LOCALES_DIR, "en", `${namespace}.json`);
      const enContent = JSON.parse(fs.readFileSync(enPath, "utf-8"));
      const values = extractValues(enContent);

      const emptyValues = values.filter((v) => v === "");
      expect(emptyValues).toHaveLength(0);
    });
  });

  it("should not have empty string values in RU translations", () => {
    NAMESPACES.forEach((namespace) => {
      const ruPath = path.join(LOCALES_DIR, "ru", `${namespace}.json`);
      const ruContent = JSON.parse(fs.readFileSync(ruPath, "utf-8"));
      const values = extractValues(ruContent);

      const emptyValues = values.filter((v) => v === "");
      expect(emptyValues).toHaveLength(0);
    });
  });

  it("should not contain TODO markers in EN translations", () => {
    NAMESPACES.forEach((namespace) => {
      const enPath = path.join(LOCALES_DIR, "en", `${namespace}.json`);
      const enContent = JSON.parse(fs.readFileSync(enPath, "utf-8"));
      const values = extractValues(enContent);

      const todoValues = values.filter((v) => v.includes("TODO"));
      expect(todoValues).toHaveLength(0);
    });
  });

  it("should not contain TODO markers in RU translations", () => {
    NAMESPACES.forEach((namespace) => {
      const ruPath = path.join(LOCALES_DIR, "ru", `${namespace}.json`);
      const ruContent = JSON.parse(fs.readFileSync(ruPath, "utf-8"));
      const values = extractValues(ruContent);

      const todoValues = values.filter((v) => v.includes("TODO"));
      expect(todoValues).toHaveLength(0);
    });
  });

  it("should not contain FIXME markers in EN translations", () => {
    NAMESPACES.forEach((namespace) => {
      const enPath = path.join(LOCALES_DIR, "en", `${namespace}.json`);
      const enContent = JSON.parse(fs.readFileSync(enPath, "utf-8"));
      const values = extractValues(enContent);

      const fixmeValues = values.filter((v) => v.includes("FIXME"));
      expect(fixmeValues).toHaveLength(0);
    });
  });

  it("should not contain FIXME markers in RU translations", () => {
    NAMESPACES.forEach((namespace) => {
      const ruPath = path.join(LOCALES_DIR, "ru", `${namespace}.json`);
      const ruContent = JSON.parse(fs.readFileSync(ruPath, "utf-8"));
      const values = extractValues(ruContent);

      const fixmeValues = values.filter((v) => v.includes("FIXME"));
      expect(fixmeValues).toHaveLength(0);
    });
  });
});
