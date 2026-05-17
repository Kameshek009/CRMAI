import { describe, it, expect, beforeEach } from "vitest";
import {
  readConsentFromCookie,
  writeConsentCookie,
  hasAnalyticsConsent,
} from "@/lib/gdpr/consent";
import { COOKIE_CONSENT_NAME, COOKIE_CONSENT_VERSION } from "@/lib/gdpr/config";

function clearAllCookies() {
  // jsdom: setting a cookie to expire=past removes it
  document.cookie.split(";").forEach((c) => {
    const eq = c.indexOf("=");
    const name = (eq > -1 ? c.slice(0, eq) : c).trim();
    document.cookie = `${name}=; Max-Age=0; Path=/`;
  });
}

describe("cookie consent", () => {
  beforeEach(() => {
    clearAllCookies();
  });

  it("returns null before any consent has been recorded", () => {
    expect(readConsentFromCookie()).toBeNull();
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it("round-trips a written choice", () => {
    const state = writeConsentCookie({ analytics: true, marketing: false });
    expect(state.essential).toBe(true);
    expect(state.analytics).toBe(true);
    expect(state.marketing).toBe(false);
    expect(state.version).toBe(COOKIE_CONSENT_VERSION);

    const read = readConsentFromCookie();
    expect(read?.analytics).toBe(true);
    expect(read?.marketing).toBe(false);
    expect(hasAnalyticsConsent()).toBe(true);
  });

  it("ignores cookies from an older version", () => {
    document.cookie = `${COOKIE_CONSENT_NAME}=${encodeURIComponent(
      JSON.stringify({
        essential: true,
        analytics: true,
        marketing: true,
        ts: new Date().toISOString(),
        version: COOKIE_CONSENT_VERSION - 1,
      }),
    )}; Path=/`;

    expect(readConsentFromCookie()).toBeNull();
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it("ignores cookies with invalid JSON", () => {
    document.cookie = `${COOKIE_CONSENT_NAME}=not-json; Path=/`;
    expect(readConsentFromCookie()).toBeNull();
  });
});
