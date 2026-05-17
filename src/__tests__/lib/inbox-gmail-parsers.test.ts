import { describe, it, expect } from "vitest";
import { extractBodies, getHeader, parseAddressList } from "@/lib/inbox/gmail";
import type { GmailMessage } from "@/lib/inbox/gmail";

describe("inbox/gmail parsers", () => {
  describe("getHeader", () => {
    it("returns matching header value (case-insensitive)", () => {
      const payload: GmailMessage["payload"] = {
        headers: [
          { name: "From", value: "a@b" },
          { name: "Subject", value: "Hi" },
        ],
      };
      expect(getHeader(payload, "from")).toBe("a@b");
      expect(getHeader(payload, "SUBJECT")).toBe("Hi");
    });

    it("returns null when header absent", () => {
      const payload: GmailMessage["payload"] = { headers: [] };
      expect(getHeader(payload, "From")).toBeNull();
    });

    it("returns null when payload missing", () => {
      expect(getHeader(undefined, "From")).toBeNull();
    });
  });

  describe("extractBodies", () => {
    function b64(s: string): string {
      return Buffer.from(s, "utf8").toString("base64url");
    }

    it("extracts text/plain from single-part body", () => {
      const result = extractBodies({
        mimeType: "text/plain",
        body: { data: b64("Hello world") },
      });
      expect(result).toEqual({ text: "Hello world", html: null });
    });

    it("extracts text/html from single-part body", () => {
      const result = extractBodies({
        mimeType: "text/html",
        body: { data: b64("<p>Hi</p>") },
      });
      expect(result).toEqual({ text: null, html: "<p>Hi</p>" });
    });

    it("walks multipart/alternative and returns both", () => {
      const result = extractBodies({
        mimeType: "multipart/alternative",
        parts: [
          { mimeType: "text/plain", body: { data: b64("Hi plain") } },
          { mimeType: "text/html", body: { data: b64("<p>Hi html</p>") } },
        ],
      });
      expect(result).toEqual({ text: "Hi plain", html: "<p>Hi html</p>" });
    });

    it("returns nulls when no recognizable body found", () => {
      const result = extractBodies({
        mimeType: "multipart/mixed",
        parts: [{ mimeType: "image/png", body: { size: 1234 } }],
      });
      expect(result).toEqual({ text: null, html: null });
    });

    it("handles UTF-8 characters", () => {
      const result = extractBodies({
        mimeType: "text/plain",
        body: { data: b64("Привет мир 你好") },
      });
      expect(result.text).toBe("Привет мир 你好");
    });
  });

  describe("parseAddressList", () => {
    it("returns empty array on null", () => {
      expect(parseAddressList(null)).toEqual([]);
    });

    it("splits on commas and strips display names", () => {
      const out = parseAddressList('"Alice" <a@b>, bob@c, "Carol Cook" <c@d>');
      expect(out).toEqual(["a@b", "bob@c", "c@d"]);
    });

    it("filters out entries without @", () => {
      expect(parseAddressList("garbage, a@b, more garbage")).toEqual(["a@b"]);
    });

    it("lowercases addresses", () => {
      expect(parseAddressList("Alice@EXAMPLE.com")).toEqual(["alice@example.com"]);
    });
  });
});
