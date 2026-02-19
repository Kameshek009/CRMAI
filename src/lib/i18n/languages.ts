import type { Locale } from "./types";

export interface Language {
  code: Locale;
  name: string;
  nativeName: string;
}

export const languages: Language[] = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "ru", name: "Russian", nativeName: "Русский" },
];

export const defaultLocale: Locale = "en";
