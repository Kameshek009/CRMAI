import { describe, it, expect } from "vitest";
import {
  mapHubSpotCompany,
  mapHubSpotContact,
  mapHubSpotDeal,
} from "@/lib/importers/hubspot/mappers";

describe("importers/hubspot/mappers", () => {
  describe("mapHubSpotContact", () => {
    it("lowercases email and uses it for dedup", () => {
      const r = mapHubSpotContact({
        id: "1",
        properties: { firstname: "Alice", lastname: "Smith", email: "ALICE@Example.com", phone: "+1" },
      });
      expect(r.entity).toBe("contacts");
      expect(r.row.email).toBe("alice@example.com");
      expect(r.row.first_name).toBe("Alice");
      expect(r.row.last_name).toBe("Smith");
      expect(r.dedupBy).toEqual({ column: "email", value: "alice@example.com" });
    });

    it("falls back to email-local-part when firstname missing", () => {
      const r = mapHubSpotContact({
        id: "2",
        properties: { email: "bob@example.com" },
      });
      expect(r.row.first_name).toBe("bob");
    });

    it("falls back to 'Unknown' when no email or firstname", () => {
      const r = mapHubSpotContact({ id: "3", properties: {} });
      expect(r.row.first_name).toBe("Unknown");
      expect(r.dedupBy).toBeUndefined();
    });

    it("prefers phone over mobilephone", () => {
      const r = mapHubSpotContact({
        id: "4",
        properties: { phone: "+1", mobilephone: "+2" },
      });
      expect(r.row.phone).toBe("+1");
    });

    it("falls back to mobilephone when phone missing", () => {
      const r = mapHubSpotContact({
        id: "5",
        properties: { mobilephone: "+2" },
      });
      expect(r.row.phone).toBe("+2");
    });

    it("maps lifecyclestage to our status enum", () => {
      expect(mapHubSpotContact({ id: "1", properties: { lifecyclestage: "lead" } }).row.status).toBe("lead");
      expect(mapHubSpotContact({ id: "1", properties: { lifecyclestage: "customer" } }).row.status).toBe("active");
      expect(mapHubSpotContact({ id: "1", properties: { lifecyclestage: "churned" } }).row.status).toBe("churned");
      expect(mapHubSpotContact({ id: "1", properties: { lifecyclestage: "unknownvalue" } }).row.status).toBeNull();
    });

    it("includes upstream id and source in row", () => {
      const r = mapHubSpotContact({ id: "777", properties: { email: "x@y.com" } });
      expect(r.upstreamId).toBe("777");
      expect(r.row.source).toBe("hubspot");
      expect((r.row.metadata as Record<string, unknown>).hubspot_id).toBe("777");
    });
  });

  describe("mapHubSpotCompany", () => {
    it("deduplicates by domain (lowercased + trimmed)", () => {
      const r = mapHubSpotCompany({
        id: "10",
        properties: { name: "Acme", domain: "  Acme.Com " },
      });
      expect(r.dedupBy).toEqual({ column: "domain", value: "acme.com" });
    });

    it("uses 'Untitled' fallback when name missing", () => {
      const r = mapHubSpotCompany({ id: "11", properties: {} });
      expect(r.row.name).toBe("Untitled");
    });
  });

  describe("mapHubSpotDeal", () => {
    it("parses amount as number", () => {
      const r = mapHubSpotDeal({
        id: "20",
        properties: { dealname: "Big", amount: "12345.67" },
      });
      expect(r.row.amount).toBe(12345.67);
    });

    it("returns null amount when not numeric", () => {
      const r = mapHubSpotDeal({
        id: "21",
        properties: { dealname: "Big", amount: "n/a" },
      });
      expect(r.row.amount).toBeNull();
    });

    it("normalises closedate to YYYY-MM-DD", () => {
      const r = mapHubSpotDeal({
        id: "22",
        properties: { dealname: "X", closedate: "2026-05-17T10:00:00.000Z" },
      });
      expect(r.row.expected_close_date).toBe("2026-05-17");
    });

    it("preserves upstream associations in metadata", () => {
      const r = mapHubSpotDeal({
        id: "23",
        properties: { dealname: "X" },
        associations: {
          contacts: { results: [{ id: "c1" }, { id: "c2" }] },
          companies: { results: [{ id: "co1" }] },
        },
      });
      const meta = r.row.metadata as Record<string, unknown>;
      expect(meta.hubspot_associated_contacts).toEqual(["c1", "c2"]);
      expect(meta.hubspot_associated_companies).toEqual(["co1"]);
    });
  });
});
