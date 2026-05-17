import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  buildEmbeddedSignupUrl,
  getEmbeddedSignupConfig,
  isEmbeddedSignupConfigured,
} from "@/lib/whatsapp/embedded-signup";

function setEnv() {
  process.env.WHATSAPP_META_APP_ID = "123";
  process.env.WHATSAPP_META_APP_SECRET = "secret-x";
  process.env.WHATSAPP_META_CONFIG_ID = "cfg-1";
  process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
}

function clearEnv() {
  delete process.env.WHATSAPP_META_APP_ID;
  delete process.env.WHATSAPP_META_APP_SECRET;
  delete process.env.WHATSAPP_META_CONFIG_ID;
  delete process.env.NEXT_PUBLIC_APP_URL;
}

describe("whatsapp/embedded-signup config", () => {
  beforeEach(() => setEnv());
  afterEach(() => clearEnv());

  it("getEmbeddedSignupConfig returns config with redirectUri when env is set", () => {
    const cfg = getEmbeddedSignupConfig();
    expect(cfg?.appId).toBe("123");
    expect(cfg?.redirectUri).toBe("https://app.example.com/api/oauth/whatsapp/callback");
    expect(isEmbeddedSignupConfigured()).toBe(true);
  });

  it("returns null and isEmbeddedSignupConfigured=false when any var missing", () => {
    delete process.env.WHATSAPP_META_APP_SECRET;
    expect(getEmbeddedSignupConfig()).toBeNull();
    expect(isEmbeddedSignupConfigured()).toBe(false);
  });

  it("buildEmbeddedSignupUrl includes config_id, scope, state, redirect_uri", () => {
    const url = new URL(buildEmbeddedSignupUrl({ state: "s-1" }));
    expect(url.origin + url.pathname).toBe("https://www.facebook.com/v21.0/dialog/oauth");
    expect(url.searchParams.get("client_id")).toBe("123");
    expect(url.searchParams.get("state")).toBe("s-1");
    expect(url.searchParams.get("config_id")).toBe("cfg-1");
    expect(url.searchParams.get("response_type")).toBe("code");
    const scope = url.searchParams.get("scope")!;
    expect(scope.split(",")).toContain("whatsapp_business_management");
    expect(scope.split(",")).toContain("whatsapp_business_messaging");
    const extras = JSON.parse(url.searchParams.get("extras")!);
    expect(extras.feature).toBe("whatsapp_embedded_signup");
  });

  it("buildEmbeddedSignupUrl throws when env missing", () => {
    clearEnv();
    expect(() => buildEmbeddedSignupUrl({ state: "x" })).toThrow();
  });

  it("strips trailing slash from app URL when building redirect_uri", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com/";
    expect(getEmbeddedSignupConfig()?.redirectUri).toBe(
      "https://app.example.com/api/oauth/whatsapp/callback",
    );
  });
});
