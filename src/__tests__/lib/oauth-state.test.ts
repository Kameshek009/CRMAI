import { describe, it, expect } from "vitest";
import {
  decodeStateCookie,
  encodeStateCookie,
  generateStateValue,
  safeStateEqual,
  sanitizeReturnTo,
} from "@/lib/oauth/state";

describe("oauth/state", () => {
  it("generateStateValue returns 64 hex chars (32 bytes)", () => {
    const v = generateStateValue();
    expect(v).toHaveLength(64);
    expect(/^[a-f0-9]+$/.test(v)).toBe(true);
  });

  it("two consecutive generateStateValue calls differ", () => {
    expect(generateStateValue()).not.toBe(generateStateValue());
  });

  it("encode/decode round-trips state and returnTo", () => {
    const cookie = encodeStateCookie("abc123", "/dashboard/account?tab=integrations");
    const decoded = decodeStateCookie(cookie);
    expect(decoded).toEqual({
      state: "abc123",
      returnTo: "/dashboard/account?tab=integrations",
    });
  });

  it("decode returns null on malformed cookie", () => {
    expect(decodeStateCookie("")).toBeNull();
    expect(decodeStateCookie("nostatestoken")).toBeNull();
    expect(decodeStateCookie(":onlyreturn")).toBeNull();
    expect(decodeStateCookie("onlystate:")).toBeNull();
  });

  it("safeStateEqual is constant-time on equal-length", () => {
    expect(safeStateEqual("abc", "abc")).toBe(true);
    expect(safeStateEqual("abc", "abd")).toBe(false);
  });

  it("safeStateEqual returns false on different lengths without throwing", () => {
    expect(safeStateEqual("abc", "abcd")).toBe(false);
    expect(safeStateEqual("", "x")).toBe(false);
  });

  it("sanitizeReturnTo rejects external URLs", () => {
    expect(sanitizeReturnTo("https://evil.com/x", "/safe")).toBe("/safe");
    expect(sanitizeReturnTo("//evil.com/x", "/safe")).toBe("/safe");
    expect(sanitizeReturnTo("javascript:alert(1)", "/safe")).toBe("/safe");
  });

  it("sanitizeReturnTo accepts internal paths", () => {
    expect(sanitizeReturnTo("/dashboard/account?tab=integrations", "/fb")).toBe(
      "/dashboard/account?tab=integrations",
    );
    expect(sanitizeReturnTo("/", "/fb")).toBe("/");
  });

  it("sanitizeReturnTo falls back when input is null/empty", () => {
    expect(sanitizeReturnTo(null, "/fb")).toBe("/fb");
    expect(sanitizeReturnTo("", "/fb")).toBe("/fb");
  });

  it("encodeStateCookie tolerates returnTo with colons and special chars", () => {
    const original = "/x?y=z&foo=bar:baz";
    const cookie = encodeStateCookie("s", original);
    const decoded = decodeStateCookie(cookie);
    expect(decoded?.returnTo).toBe(original);
  });
});
