import { describe, it, expect } from "vitest";
import {
  extractMessageIdFromResource,
  parseFromAddress,
  parseRecipients,
} from "@/lib/inbox/microsoft";

describe("inbox/microsoft parsers", () => {
  describe("parseFromAddress", () => {
    it("returns lowercase email when From.emailAddress.address present", () => {
      expect(
        parseFromAddress({
          id: "1",
          from: { emailAddress: { address: "Alice@Example.com" } },
        }),
      ).toBe("alice@example.com");
    });

    it("falls back to display-name parsing", () => {
      expect(
        parseFromAddress({
          id: "1",
          from: { emailAddress: { name: '"Alice" <alice@x.com>' } },
        }),
      ).toBe("alice@x.com");
    });

    it("returns empty string when From missing", () => {
      expect(parseFromAddress({ id: "1" })).toBe("");
    });
  });

  describe("parseRecipients", () => {
    it("returns lowercased email list", () => {
      expect(
        parseRecipients([
          { emailAddress: { address: "A@b.com" } },
          { emailAddress: { address: "BOB@example.com" } },
        ]),
      ).toEqual(["a@b.com", "bob@example.com"]);
    });

    it("filters out malformed entries", () => {
      expect(parseRecipients([{ emailAddress: { address: "garbage" } }])).toEqual([]);
    });

    it("returns empty array on undefined", () => {
      expect(parseRecipients(undefined)).toEqual([]);
    });
  });

  describe("extractMessageIdFromResource", () => {
    it.each([
      ["Users/abc/Messages/AAMkAGI=", "AAMkAGI="],
      ["me/messages/AAMkAGI2-bar", "AAMkAGI2-bar"],
      ["me/messages/AAMkAGI/", null],
      ["", null],
      ["nothing-relevant", null],
    ])("%s → %s", (input, expected) => {
      expect(extractMessageIdFromResource(input)).toBe(expected);
    });
  });
});
