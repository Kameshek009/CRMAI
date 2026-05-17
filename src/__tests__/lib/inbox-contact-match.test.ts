import { describe, it, expect } from "vitest";
import { normalizeEmail, parseFromHeader } from "@/lib/inbox/contact-match";

describe("inbox/contact-match", () => {
  describe("normalizeEmail", () => {
    it("lowercases and trims", () => {
      expect(normalizeEmail("  Alice@Example.com  ")).toBe("alice@example.com");
    });

    it("strips plus-addressing", () => {
      expect(normalizeEmail("foo+bar@example.com")).toBe("foo@example.com");
      expect(normalizeEmail("Foo+Anything-Else@DOMAIN.com")).toBe("foo@domain.com");
    });

    it("preserves emails without plus", () => {
      expect(normalizeEmail("a.b.c@gmail.com")).toBe("a.b.c@gmail.com");
    });

    it("handles malformed strings without throwing", () => {
      expect(normalizeEmail("no-at-sign")).toBe("no-at-sign");
      expect(normalizeEmail("")).toBe("");
    });

    it("strips only the first plus chunk in the local part", () => {
      expect(normalizeEmail("a+x+y@example.com")).toBe("a@example.com");
    });

    it("does not strip plus from the domain portion", () => {
      // Per RFC plus is illegal in domain; we still don't strip it.
      expect(normalizeEmail("foo@bar+baz.com")).toBe("foo@bar+baz.com");
    });
  });

  describe("parseFromHeader", () => {
    it("returns address from RFC display-name form", () => {
      expect(parseFromHeader('"Alice Cooper" <alice@example.com>')).toBe("alice@example.com");
      expect(parseFromHeader("Alice <a@b>")).toBe("a@b");
    });

    it("returns trimmed bare address", () => {
      expect(parseFromHeader("  alice@example.com  ")).toBe("alice@example.com");
    });

    it("handles missing angle brackets", () => {
      expect(parseFromHeader("alice@example.com")).toBe("alice@example.com");
    });
  });
});
