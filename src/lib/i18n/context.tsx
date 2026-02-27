"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import type { Locale } from "./types";
import { defaultLocale } from "./languages";

import enCommon from "@/locales/en/common.json";
import enSettings from "@/locales/en/settings.json";
import enNav from "@/locales/en/nav.json";
import enChat from "@/locales/en/chat.json";
import enTeam from "@/locales/en/team.json";
import enFields from "@/locales/en/fields.json";
import enCrm from "@/locales/en/crm.json";
import enNotes from "@/locales/en/notes.json";
import enBilling from "@/locales/en/billing.json";
import enLanding from "@/locales/en/landing.json";
import ruCommon from "@/locales/ru/common.json";
import ruSettings from "@/locales/ru/settings.json";
import ruNav from "@/locales/ru/nav.json";
import ruChat from "@/locales/ru/chat.json";
import ruTeam from "@/locales/ru/team.json";
import ruFields from "@/locales/ru/fields.json";
import ruCrm from "@/locales/ru/crm.json";
import ruNotes from "@/locales/ru/notes.json";
import ruBilling from "@/locales/ru/billing.json";
import ruLanding from "@/locales/ru/landing.json";

const translations: Record<Locale, Record<string, unknown>> = {
  en: { common: enCommon, settings: enSettings, nav: enNav, chat: enChat, team: enTeam, fields: enFields, crm: enCrm, notes: enNotes, billing: enBilling, landing: enLanding },
  ru: { common: ruCommon, settings: ruSettings, nav: ruNav, chat: ruChat, team: ruTeam, fields: ruFields, crm: ruCrm, notes: ruNotes, billing: ruBilling, landing: ruLanding },
};

const STORAGE_KEY = "nexxus-language";

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

function resolveKey(obj: unknown, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === "undefined") return defaultLocale;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "en" || stored === "ru") return stored;
    } catch {}
    return defaultLocale;
  });
  const isInitialized = useRef(typeof window !== "undefined");

  // Persist locale to localStorage (skip initial render to avoid overwriting saved value)
  useEffect(() => {
    if (!isInitialized.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {}
  }, [locale]);

  // Sync <html lang> attribute
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      let value =
        resolveKey(translations[locale], key) ??
        resolveKey(translations[defaultLocale], key) ??
        key;

      if (params) {
        for (const [k, v] of Object.entries(params)) {
          value = value.replaceAll(`{${k}}`, String(v));
        }
      }

      return value;
    },
    [locale]
  );

  const contextValue = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t]
  );

  return (
    <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return context;
}
