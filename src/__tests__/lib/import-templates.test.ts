import { describe, it, expect } from "vitest";
import {
  IMPORT_TEMPLATES,
  autoMap,
  contactFields,
  getTemplate,
  leadFields,
} from "@/lib/crm/import-templates";

describe("import templates", () => {
  it("ships the documented set of presets", () => {
    const ids = IMPORT_TEMPLATES.map((t) => t.id).sort();
    expect(ids).toEqual(["amocrm", "bitrix24", "generic", "hubspot", "salesforce"]);
  });

  it("every template defines mappings for both contacts and leads", () => {
    for (const tpl of IMPORT_TEMPLATES) {
      expect(Object.keys(tpl.contacts).length).toBeGreaterThan(0);
      expect(Object.keys(tpl.leads).length).toBeGreaterThan(0);
    }
  });

  it("getTemplate returns the template by id, undefined for unknown ids", () => {
    expect(getTemplate("hubspot")?.name).toBe("HubSpot");
    expect(getTemplate("unknown")).toBeUndefined();
  });
});

describe("autoMap", () => {
  const hubspot = getTemplate("hubspot")!;
  const bitrix = getTemplate("bitrix24")!;
  const generic = getTemplate("generic")!;

  it("matches HubSpot contact export headers", () => {
    const headers = ["First Name", "Last Name", "Email", "Phone Number", "Job Title", "Company name"];
    const map = autoMap(hubspot, "contacts", headers);
    expect(map).toEqual(["first_name", "last_name", "email", "phone", "title", "company"]);
  });

  it("is case-insensitive for headers", () => {
    const map = autoMap(hubspot, "contacts", ["FIRST NAME", "email"]);
    expect(map).toEqual(["first_name", "email"]);
  });

  it("matches Bitrix24 Russian headers for leads", () => {
    const headers = ["Имя", "Фамилия", "Email", "Телефон", "Компания", "Должность"];
    const map = autoMap(bitrix, "leads", headers);
    expect(map).toEqual(["first_name", "last_name", "email", "phone", "organization", "job_title"]);
  });

  it("returns null for unknown columns instead of throwing", () => {
    const map = autoMap(generic, "contacts", ["random_column", "first_name"]);
    expect(map).toEqual([null, "first_name"]);
  });

  it("trims whitespace in headers before matching", () => {
    const map = autoMap(hubspot, "contacts", ["  First Name  ", " Email "]);
    expect(map).toEqual(["first_name", "email"]);
  });
});

describe("field catalogues", () => {
  it("contactFields includes first_name + email at minimum", () => {
    const fields = contactFields();
    expect(fields).toContain("first_name");
    expect(fields).toContain("email");
  });

  it("leadFields includes lead-specific fields like status and mobile", () => {
    const fields = leadFields();
    expect(fields).toContain("status");
    expect(fields).toContain("mobile");
    expect(fields).toContain("organization");
  });
});
