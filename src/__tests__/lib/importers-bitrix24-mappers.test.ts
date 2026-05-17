import { describe, it, expect } from "vitest";
import {
  mapBitrix24Company,
  mapBitrix24Contact,
  mapBitrix24Deal,
  mapBitrix24Lead,
} from "@/lib/importers/bitrix24/mappers";
import { isValidBitrix24Domain } from "@/lib/importers/bitrix24/oauth";

describe("importers/bitrix24/mappers", () => {
  describe("mapBitrix24Lead", () => {
    it("extracts first VALUE from EMAIL/PHONE arrays", () => {
      const r = mapBitrix24Lead({
        ID: "1",
        NAME: "Alice",
        LAST_NAME: "Smith",
        EMAIL: [{ VALUE: "Alice@Example.com", VALUE_TYPE: "WORK" }],
        PHONE: [{ VALUE: "+79999" }],
      });
      expect(r.entity).toBe("leads");
      expect(r.row.email).toBe("alice@example.com");
      expect(r.row.phone).toBe("+79999");
      expect(r.dedupBy).toEqual({ column: "email", value: "alice@example.com" });
    });

    it("maps STATUS_ID to our lead status enum", () => {
      expect(mapBitrix24Lead({ ID: "1", STATUS_ID: "NEW" }).row.status).toBe("new");
      expect(mapBitrix24Lead({ ID: "1", STATUS_ID: "IN_PROCESS" }).row.status).toBe("working");
      expect(mapBitrix24Lead({ ID: "1", STATUS_ID: "CONVERTED" }).row.status).toBe("converted");
      expect(mapBitrix24Lead({ ID: "1", STATUS_ID: "JUNK" }).row.status).toBe("disqualified");
      expect(mapBitrix24Lead({ ID: "1", STATUS_ID: "UNKNOWN" }).row.status).toBeNull();
    });

    it("preserves COMPANY_TITLE as organization", () => {
      const r = mapBitrix24Lead({ ID: "1", NAME: "X", COMPANY_TITLE: " Acme " });
      expect(r.row.organization).toBe("Acme");
    });

    it("falls back to email-local-part for missing first name", () => {
      const r = mapBitrix24Lead({
        ID: "1",
        EMAIL: [{ VALUE: "bob@example.com" }],
      });
      expect(r.row.first_name).toBe("bob");
    });
  });

  describe("mapBitrix24Contact", () => {
    it("populates title from POST", () => {
      const r = mapBitrix24Contact({ ID: "1", NAME: "X", POST: "CEO" });
      expect(r.row.title).toBe("CEO");
    });

    it("dedup by email when present", () => {
      const r = mapBitrix24Contact({
        ID: "1",
        NAME: "Bob",
        EMAIL: [{ VALUE: "bob@x.com" }],
      });
      expect(r.dedupBy).toEqual({ column: "email", value: "bob@x.com" });
    });
  });

  describe("mapBitrix24Company", () => {
    it("maps WEB as website and TITLE as name", () => {
      const r = mapBitrix24Company({
        ID: "1",
        TITLE: "Acme",
        WEB: [{ VALUE: "https://acme.com" }],
        ADDRESS_CITY: "London",
      });
      expect(r.row.name).toBe("Acme");
      expect(r.row.website).toBe("https://acme.com");
      expect(r.row.city).toBe("London");
    });
  });

  describe("mapBitrix24Deal", () => {
    it("converts OPPORTUNITY to numeric amount", () => {
      const r = mapBitrix24Deal({ ID: "1", TITLE: "X", OPPORTUNITY: "12345.67" });
      expect(r.row.amount).toBe(12345.67);
    });

    it("trims CLOSEDATE to YYYY-MM-DD", () => {
      const r = mapBitrix24Deal({ ID: "1", TITLE: "X", CLOSEDATE: "2026-05-17T10:00:00+03:00" });
      expect(r.row.expected_close_date).toBe("2026-05-17");
    });

    it("preserves Bitrix24 stage/category in metadata for later mapping", () => {
      const r = mapBitrix24Deal({
        ID: "1",
        TITLE: "X",
        STAGE_ID: "EXECUTING",
        CATEGORY_ID: "1",
      });
      const meta = r.row.metadata as Record<string, unknown>;
      expect(meta.bitrix24_stage_id).toBe("EXECUTING");
      expect(meta.bitrix24_category_id).toBe("1");
    });
  });
});

describe("importers/bitrix24/oauth domain validation", () => {
  it.each([
    "mycompany.bitrix24.ru",
    "abc.bitrix24.com",
    "test.bitrix24.de",
    "co-pany.bitrix24.eu",
  ])("accepts %s", (s) => {
    expect(isValidBitrix24Domain(s)).toBe(true);
  });

  it.each([
    "",
    "evil.com",
    "mycompany.bitrix24.ru.attacker.com",
    "javascript:alert(1)",
    "bitrix24.ru",
  ])("rejects %s", (s) => {
    expect(isValidBitrix24Domain(s)).toBe(false);
  });
});
