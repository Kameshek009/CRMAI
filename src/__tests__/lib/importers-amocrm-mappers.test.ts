import { describe, it, expect } from "vitest";
import {
  mapAmoCRMCompany,
  mapAmoCRMContact,
  mapAmoCRMLead,
} from "@/lib/importers/amocrm/mappers";
import { isValidAmoCRMSubdomain } from "@/lib/importers/amocrm/oauth";

describe("importers/amocrm/mappers", () => {
  describe("mapAmoCRMContact", () => {
    it("extracts email from custom_fields_values and lowercases", () => {
      const r = mapAmoCRMContact({
        id: 1,
        name: "Alice Smith",
        custom_fields_values: [
          { field_code: "EMAIL", values: [{ value: "Alice@Example.com" }] },
          { field_code: "PHONE", values: [{ value: "+79999" }] },
        ],
      });
      expect(r.row.email).toBe("alice@example.com");
      expect(r.row.phone).toBe("+79999");
      expect(r.dedupBy).toEqual({ column: "email", value: "alice@example.com" });
    });

    it("splits a single 'name' field into first/last when first_name/last_name absent", () => {
      const r = mapAmoCRMContact({ id: 1, name: "Ivan Petrov" });
      expect(r.row.first_name).toBe("Ivan");
      expect(r.row.last_name).toBe("Petrov");
    });

    it("uses first_name + last_name when provided", () => {
      const r = mapAmoCRMContact({ id: 1, first_name: "Анна", last_name: "Иванова" });
      expect(r.row.first_name).toBe("Анна");
      expect(r.row.last_name).toBe("Иванова");
    });

    it("uses 'Unknown' when no name fields", () => {
      const r = mapAmoCRMContact({ id: 1 });
      expect(r.row.first_name).toBe("Unknown");
      expect(r.row.last_name).toBeNull();
    });

    it("preserves amocrm tags in metadata", () => {
      const r = mapAmoCRMContact({
        id: 1,
        name: "X",
        _embedded: { tags: [{ id: 1, name: "vip" }, { id: 2, name: "warm" }] },
      });
      expect((r.row.metadata as Record<string, unknown>).amocrm_tags).toEqual(["vip", "warm"]);
    });
  });

  describe("mapAmoCRMCompany", () => {
    it("extracts website from WEB custom field", () => {
      const r = mapAmoCRMCompany({
        id: 5,
        name: "Acme",
        custom_fields_values: [{ field_code: "WEB", values: [{ value: "https://acme.com" }] }],
      });
      expect(r.row.website).toBe("https://acme.com");
    });

    it("uses 'Untitled' for missing name", () => {
      const r = mapAmoCRMCompany({ id: 5, name: "" });
      expect(r.row.name).toBe("Untitled");
    });
  });

  describe("mapAmoCRMLead", () => {
    it("maps to deals with price as amount", () => {
      const r = mapAmoCRMLead({ id: 9, name: "Apartment sale", price: 500000 });
      expect(r.entity).toBe("deals");
      expect(r.row.title).toBe("Apartment sale");
      expect(r.row.amount).toBe(500000);
      expect(r.row.stage).toBe("new");
    });

    it("preserves associated contacts/companies in metadata", () => {
      const r = mapAmoCRMLead({
        id: 1,
        name: "X",
        _embedded: { contacts: [{ id: 11 }], companies: [{ id: 22 }] },
      });
      const meta = r.row.metadata as Record<string, unknown>;
      expect(meta.amocrm_associated_contacts).toEqual([11]);
      expect(meta.amocrm_associated_companies).toEqual([22]);
    });
  });
});

describe("importers/amocrm/oauth subdomain validation", () => {
  it.each([
    "company.amocrm.ru",
    "co-pany.amocrm.ru",
    "myco.amocrm.com",
    "team.kommo.com",
  ])("accepts %s", (s) => {
    expect(isValidAmoCRMSubdomain(s)).toBe(true);
  });

  it.each([
    "",
    "evil.com",
    "evil.amocrm.ru.attacker.com",
    "javascript:alert(1)",
    "amocrm.ru",
    "../etc/passwd",
  ])("rejects %s", (s) => {
    expect(isValidAmoCRMSubdomain(s)).toBe(false);
  });

  it("rejects null/undefined", () => {
    expect(isValidAmoCRMSubdomain(null)).toBe(false);
    expect(isValidAmoCRMSubdomain(undefined)).toBe(false);
  });
});
