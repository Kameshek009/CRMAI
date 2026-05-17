import { COOKIE_CONSENT_NAME, COOKIE_CONSENT_VERSION, COOKIE_CONSENT_MAX_AGE } from "./config";

export type ConsentChoices = {
  analytics: boolean;
  marketing: boolean;
};

export type ConsentState = ConsentChoices & {
  essential: true;
  ts: string;
  version: number;
};

function isClient(): boolean {
  return typeof document !== "undefined";
}

export function readConsentFromCookie(): ConsentState | null {
  if (!isClient()) return null;
  const prefix = `${COOKIE_CONSENT_NAME}=`;
  const raw = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(prefix));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw.slice(prefix.length))) as ConsentState;
    if (parsed.version !== COOKIE_CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeConsentCookie(choices: ConsentChoices): ConsentState {
  const state: ConsentState = {
    essential: true,
    analytics: choices.analytics,
    marketing: choices.marketing,
    ts: new Date().toISOString(),
    version: COOKIE_CONSENT_VERSION,
  };
  if (isClient()) {
    const value = encodeURIComponent(JSON.stringify(state));
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${COOKIE_CONSENT_NAME}=${value}; Path=/; Max-Age=${COOKIE_CONSENT_MAX_AGE}; SameSite=Lax${secure}`;
  }
  return state;
}

export function hasAnalyticsConsent(): boolean {
  return readConsentFromCookie()?.analytics === true;
}
