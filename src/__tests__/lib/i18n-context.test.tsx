import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";

// Mock all locale JSON imports with controlled test data
vi.mock("@/locales/en/common.json", () => ({
  default: { greeting: "Hello", farewell: "Goodbye", withParam: "Hello {name}" },
}));
vi.mock("@/locales/en/settings.json", () => ({
  default: { title: "Settings" },
}));
vi.mock("@/locales/en/nav.json", () => ({ default: {} }));
vi.mock("@/locales/en/chat.json", () => ({ default: {} }));
vi.mock("@/locales/en/team.json", () => ({ default: {} }));
vi.mock("@/locales/en/fields.json", () => ({ default: {} }));
vi.mock("@/locales/en/crm.json", () => ({ default: {} }));
vi.mock("@/locales/en/notes.json", () => ({ default: {} }));
vi.mock("@/locales/en/billing.json", () => ({ default: {} }));
vi.mock("@/locales/en/landing.json", () => ({ default: {} }));
vi.mock("@/locales/ru/common.json", () => ({
  default: { greeting: "Привет" },
}));
vi.mock("@/locales/ru/settings.json", () => ({
  default: { title: "Настройки" },
}));
vi.mock("@/locales/ru/nav.json", () => ({ default: {} }));
vi.mock("@/locales/ru/chat.json", () => ({ default: {} }));
vi.mock("@/locales/ru/team.json", () => ({ default: {} }));
vi.mock("@/locales/ru/fields.json", () => ({ default: {} }));
vi.mock("@/locales/ru/crm.json", () => ({ default: {} }));
vi.mock("@/locales/ru/notes.json", () => ({ default: {} }));
vi.mock("@/locales/ru/billing.json", () => ({ default: {} }));
vi.mock("@/locales/ru/landing.json", () => ({ default: {} }));

// Mock localStorage
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => localStorageMock.store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageMock.store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageMock.store[key];
  }),
  clear: vi.fn(() => {
    localStorageMock.store = {};
  }),
  get length() {
    return Object.keys(localStorageMock.store).length;
  },
  key: vi.fn(() => null),
};
Object.defineProperty(window, "localStorage", { value: localStorageMock });

import { LanguageProvider, useTranslation } from "@/lib/i18n/context";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <LanguageProvider>{children}</LanguageProvider>
);

describe("i18n context", () => {
  beforeEach(() => {
    localStorageMock.store = {};
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    document.documentElement.lang = "";
  });

  it("useTranslation throws when used outside LanguageProvider", () => {
    expect(() => {
      renderHook(() => useTranslation());
    }).toThrow("useTranslation must be used within a LanguageProvider");
  });

  it("default locale is 'en'", () => {
    const { result } = renderHook(() => useTranslation(), { wrapper });

    expect(result.current.locale).toBe("en");
  });

  it("t() resolves dot-separated keys", () => {
    const { result } = renderHook(() => useTranslation(), { wrapper });

    expect(result.current.t("common.greeting")).toBe("Hello");
    expect(result.current.t("common.farewell")).toBe("Goodbye");
    expect(result.current.t("settings.title")).toBe("Settings");
  });

  it("t() returns the key itself when not found in any locale", () => {
    const { result } = renderHook(() => useTranslation(), { wrapper });

    expect(result.current.t("nonexistent.key")).toBe("nonexistent.key");
    expect(result.current.t("common.missing")).toBe("common.missing");
  });

  it("t() supports parameter interpolation", () => {
    const { result } = renderHook(() => useTranslation(), { wrapper });

    expect(result.current.t("common.withParam", { name: "World" })).toBe(
      "Hello World"
    );
  });

  it("setLocale changes the locale", () => {
    const { result } = renderHook(() => useTranslation(), { wrapper });

    expect(result.current.locale).toBe("en");

    act(() => {
      result.current.setLocale("ru");
    });

    expect(result.current.locale).toBe("ru");
  });

  it("after setLocale('ru'), t() returns Russian translations", () => {
    const { result } = renderHook(() => useTranslation(), { wrapper });

    act(() => {
      result.current.setLocale("ru");
    });

    expect(result.current.t("common.greeting")).toBe("Привет");
    expect(result.current.t("settings.title")).toBe("Настройки");
  });

  it("falls back to 'en' when key is missing in current locale", () => {
    const { result } = renderHook(() => useTranslation(), { wrapper });

    act(() => {
      result.current.setLocale("ru");
    });

    // "farewell" exists in en but not in ru mock, so it should fall back
    expect(result.current.t("common.farewell")).toBe("Goodbye");
  });

  it("reads locale from localStorage on mount", () => {
    localStorageMock.store["nexxus-language"] = "ru";

    const { result } = renderHook(() => useTranslation(), { wrapper });

    expect(localStorageMock.getItem).toHaveBeenCalledWith("nexxus-language");
    expect(result.current.locale).toBe("ru");
  });

  it("writes locale to localStorage when changed", () => {
    const { result } = renderHook(() => useTranslation(), { wrapper });

    act(() => {
      result.current.setLocale("ru");
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "nexxus-language",
      "ru"
    );
  });

  it("sets document.documentElement.lang to match locale", () => {
    const { result } = renderHook(() => useTranslation(), { wrapper });

    expect(document.documentElement.lang).toBe("en");

    act(() => {
      result.current.setLocale("ru");
    });

    expect(document.documentElement.lang).toBe("ru");
  });
});
