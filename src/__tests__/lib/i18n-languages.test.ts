import { describe, it, expect } from "vitest";
import { languages, defaultLocale } from "@/lib/i18n/languages";

describe("languages", () => {
  it("has expected number of languages", () => {
    expect(languages).toHaveLength(2);
  });

  it("each language has code, name, and nativeName", () => {
    for (const lang of languages) {
      expect(typeof lang.code).toBe("string");
      expect(lang.code.length).toBeGreaterThan(0);
      expect(typeof lang.name).toBe("string");
      expect(lang.name.length).toBeGreaterThan(0);
      expect(typeof lang.nativeName).toBe("string");
      expect(lang.nativeName.length).toBeGreaterThan(0);
    }
  });

  it("includes English", () => {
    const en = languages.find((l) => l.code === "en");
    expect(en).toBeDefined();
    expect(en!.name).toBe("English");
    expect(en!.nativeName).toBe("English");
  });

  it("includes Russian", () => {
    const ru = languages.find((l) => l.code === "ru");
    expect(ru).toBeDefined();
    expect(ru!.name).toBe("Russian");
    expect(ru!.nativeName).toBe("Русский");
  });

  it("all language codes are unique", () => {
    const codes = languages.map((l) => l.code);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });
});

describe("defaultLocale", () => {
  it("is 'en'", () => {
    expect(defaultLocale).toBe("en");
  });

  it("is one of the language codes", () => {
    const codes = languages.map((l) => l.code);
    expect(codes).toContain(defaultLocale);
  });
});
