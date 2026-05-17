import { describe, it, expect } from "vitest";
import {
  mapSalesforceAccount,
  mapSalesforceContact,
  mapSalesforceLead,
  mapSalesforceOpportunity,
} from "@/lib/importers/salesforce/mappers";
import { isValidSalesforceInstanceUrl } from "@/lib/importers/salesforce/oauth";

describe("importers/salesforce/mappers", () => {
  describe("mapSalesforceContact", () => {
    it("lowercases email and uses as dedup key", () => {
      const r = mapSalesforceContact({
        Id: "003x",
        FirstName: "Alice",
        LastName: "Smith",
        Email: "Alice@Example.com",
        Phone: "+12025550100",
        Title: "CEO",
        AccountId: "001x",
      });
      expect(r.entity).toBe("contacts");
      expect(r.row.email).toBe("alice@example.com");
      expect(r.row.title).toBe("CEO");
      expect((r.row.metadata as Record<string, unknown>).salesforce_account_id).toBe("001x");
      expect(r.dedupBy).toEqual({ column: "email", value: "alice@example.com" });
    });

    it("falls back to mobilephone when phone missing", () => {
      const r = mapSalesforceContact({
        Id: "1",
        FirstName: "X",
        LastName: "Y",
        MobilePhone: "+1",
      });
      expect(r.row.phone).toBe("+1");
    });

    it("uses email-local-part when first name missing", () => {
      const r = mapSalesforceContact({ Id: "1", LastName: "Z", Email: "bob@x.com" });
      expect(r.row.first_name).toBe("bob");
    });
  });

  describe("mapSalesforceAccount", () => {
    it("extracts domain from website and uses as dedup key", () => {
      const r = mapSalesforceAccount({
        Id: "001",
        Name: "Acme Inc.",
        Website: "https://www.Acme.com/about",
      });
      expect(r.row.domain).toBe("acme.com");
      expect(r.dedupBy).toEqual({ column: "domain", value: "acme.com" });
    });

    it("handles website without scheme", () => {
      const r = mapSalesforceAccount({
        Id: "1",
        Name: "X",
        Website: "example.org",
      });
      expect(r.row.domain).toBe("example.org");
    });

    it("returns null domain when website is malformed", () => {
      const r = mapSalesforceAccount({ Id: "1", Name: "X", Website: ":not a url:" });
      expect(r.row.domain).toBeNull();
    });
  });

  describe("mapSalesforceLead", () => {
    it("maps Status values to our lead status enum", () => {
      expect(mapSalesforceLead({ Id: "1", Status: "Open - Not Contacted" }).row.status).toBe("new");
      expect(mapSalesforceLead({ Id: "1", Status: "Working - Contacted" }).row.status).toBe("working");
      expect(mapSalesforceLead({ Id: "1", Status: "Closed - Converted" }).row.status).toBe("converted");
      expect(mapSalesforceLead({ Id: "1", Status: "Closed - Not Converted (Unqualified)" }).row.status).toBe("disqualified");
    });

    it("uses LeadSource as source field (lowercased)", () => {
      const r = mapSalesforceLead({ Id: "1", LeadSource: "Web", LastName: "X" });
      expect(r.row.source).toBe("web");
    });

    it("falls back to 'salesforce' source when LeadSource missing", () => {
      const r = mapSalesforceLead({ Id: "1", LastName: "X" });
      expect(r.row.source).toBe("salesforce");
    });
  });

  describe("mapSalesforceOpportunity", () => {
    it("keeps Amount as numeric and StageName in metadata", () => {
      const r = mapSalesforceOpportunity({
        Id: "006x",
        Name: "Big deal",
        Amount: 12345,
        StageName: "Qualification",
        CloseDate: "2026-05-31",
      });
      expect(r.row.amount).toBe(12345);
      expect(r.row.expected_close_date).toBe("2026-05-31");
      expect((r.row.metadata as Record<string, unknown>).salesforce_stage_name).toBe("Qualification");
    });
  });
});

describe("importers/salesforce/oauth instance URL validation", () => {
  it.each([
    "https://yourorg.my.salesforce.com",
    "https://test.salesforce.com",
    "https://yourorg.lightning.force.com",
    "https://eu7.salesforce.com",
  ])("accepts %s", (s) => {
    expect(isValidSalesforceInstanceUrl(s)).toBe(true);
  });

  it.each([
    "",
    "evil.com",
    "https://salesforce.com.evil.com",
    "javascript:alert(1)",
    "ftp://yourorg.my.salesforce.com",
  ])("rejects %s", (s) => {
    expect(isValidSalesforceInstanceUrl(s)).toBe(false);
  });
});
